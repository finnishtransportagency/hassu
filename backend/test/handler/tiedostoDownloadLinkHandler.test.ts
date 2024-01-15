import {
  DBProjekti,
  LausuntoPyynnonTaydennys,
  LausuntoPyynto,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
} from "../../src/database/model";
import * as API from "hassu-common/graphql/apiModel";
import { tiedostoDownloadLinkHandler } from "../../src/handler/tiedostoDownloadLinkHandler";
import { adaptLausuntoPyynnonTaydennykset, adaptLausuntoPyynnot } from "../../src/projekti/adapter/adaptToAPI";
import { assertIsDefined } from "../../src/util/assertions";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import sinon from "sinon";
import MockDate from "mockdate";
import { nyt, parseDate } from "../../src/util/dateUtil";
import { fileService } from "../../src/files/fileService";
import { parameters } from "../../src/aws/parameters";
import { expect } from "chai";
import { IllegalAccessError } from "hassu-common/error";
describe("tiedostoDownloadLinkHandler", () => {
  // Scroll down for test data definitions.
  // Test projekti has:
  // nahtavillaoloVaihe,
  // 2 nahtavilloVaiheJulkaisu, first is published
  // 2 lausuntoPyynto
  // 2 lausuntoPyynnonTaydennys

  let projektiDatabaseStub: sinon.SinonStub<[oid: string, stronglyConsistentRead?: boolean | undefined], Promise<DBProjekti | undefined>>;

  beforeEach(() => {
    sinon.stub(fileService, "getYllapitoPathForProjektiFile").returns("");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(false);
    sinon.stub(parameters, "isUspaIntegrationEnabled").resolves(false);
    projektiDatabaseStub = sinon.stub(projektiDatabase, "loadProjektiByOid").resolves(projekti);
    sinon
      .stub(fileService, "createYllapitoSignedDownloadLink")
      .callsFake((_oid, tiedosto) => Promise.resolve(`download-link-for-${tiedosto}`));
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    MockDate.reset();
  });

  it("returns correct lausuntoPyynto and nahtavillaolo files for user, when they provide correct hash and uuid, and the link has not expired", async () => {
    //Set date day before poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).subtract(1, "day").format());
    const hash = adaptLausuntoPyynnot(projekti, [lausuntoPyynto1])?.[0]?.hash;
    assertIsDefined(hash);
    const files = await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot({
      oid: "1",
      listaaLausuntoPyyntoTiedostotInput: { hash, lausuntoPyyntoUuid: lausuntoPyynto1.uuid },
    });
    // Should contain all files from specified lausuntoPyynto and all files from latest public nahtavillaoloVaiheJulkaisu
    const expectedFiles = {
      __typename: "LadattavatTiedostot",
      aineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "TiedostoA.txt",
          jarjestys: undefined,
          kategoriaId: "osa_a",
          linkki: "download-link-for-/nahtavillaolo/1/AineistoA.txt",
          tuotu: "2011-01-02",
        },
      ],
      lisaAineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_1.txt",
          jarjestys: 2,
          linkki: "download-link-for-/lausuntopyynto/joku-uuid/aineisto_1.txt",
          tuotu: "2021-06-01T01:03",
        },
      ],
      poistumisPaiva: "2022-01-01",
      aineistopaketti: "download-link-for-/lausuntopyynto/joku-uuid/aineistot.zip",
    };
    expect(files).to.eql(expectedFiles);
  });

  it("returns different files with the same hash and uuid if latest HYVAKSYTTY nahtavillaoloVaiheJulkaisu changes", async () => {
    MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).subtract(1, "day").format());
    // Hash is generated when nahtavillaolo1 is pubclished but nahtavillaolo2 is not.
    const hash = adaptLausuntoPyynnot(projekti, [lausuntoPyynto1])?.[0]?.hash;
    assertIsDefined(hash);
    // Let's imagine nahtavillaolo2 is being published now.
    const updatedProjekti = { ...projekti };
    updatedProjekti.nahtavillaoloVaiheJulkaisut = [
      nahtavillaoloJulkaisu1,
      {
        ...nahtavillaoloJulkaisu2,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
      },
    ];
    // We update this stub to reflect the changes in projekti.
    projektiDatabaseStub?.resolves(updatedProjekti);
    // The user downloads the files using the hash and uuid given before nahtavillolo publication.
    const files = await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot({
      oid: "1",
      listaaLausuntoPyyntoTiedostotInput: { hash, lausuntoPyyntoUuid: lausuntoPyynto1.uuid },
    });
    // The files the user downloaded should contain all files from specified lausuntoPyynto
    // and all files from latest public nahtavillaoloVaiheJulkaisu (the second one)
    const expectedFiles = {
      __typename: "LadattavatTiedostot",
      aineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "TiedostoB.txt",
          jarjestys: undefined,
          kategoriaId: "osa_a",
          linkki: "download-link-for-/nahtavillaolo/2/AineistoB.txt",
          tuotu: "2011-04-02",
        },
      ],
      lisaAineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_1.txt",
          jarjestys: 2,
          linkki: "download-link-for-/lausuntopyynto/joku-uuid/aineisto_1.txt",
          tuotu: "2021-06-01T01:03",
        },
      ],
      poistumisPaiva: "2022-01-01",
      aineistopaketti: "download-link-for-/lausuntopyynto/joku-uuid/aineistot.zip",
    };
    expect(files).to.eql(expectedFiles);
  });

  it(
    "returns correct lausuntoPyynto and nahtavillaolo files for user, when they provide correct hash and uuid, " +
      "even if the original expiration date passed, if a new expiration date was set in DB",
    async () => {
      //Set date day before poistumisPaiva
      MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).subtract(1, "day").format());
      const hash = adaptLausuntoPyynnot(projekti, [lausuntoPyynto1])?.[0]?.hash;
      assertIsDefined(hash);
      //Set date day after poistumisPaiva
      MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).add(1, "day").format());
      // Let's imagine link expiration date is postponed
      const updatedProjekti = { ...projekti };
      updatedProjekti.lausuntoPyynnot = [
        {
          ...lausuntoPyynto1,
          poistumisPaiva: nyt().add(10, "day").format("YYYY-MM-DD"),
        },
        lausuntoPyynto2,
      ];
      // We update this stub to reflect the changes in projekti.
      projektiDatabaseStub?.resolves(updatedProjekti);
      // The user downloads the files using the hash and uuid given when the expiration date was before the current date
      const files = await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot({
        oid: "1",
        listaaLausuntoPyyntoTiedostotInput: { hash, lausuntoPyyntoUuid: lausuntoPyynto1.uuid },
      });
      // The files the user downloaded should contain all files from specified lausuntoPyynto
      // and all files from latest public nahtavillaoloVaiheJulkaisu (the second one)
      const expectedFiles = {
        __typename: "LadattavatTiedostot",
        aineistot: [
          {
            __typename: "LadattavaTiedosto",
            nimi: "TiedostoA.txt",
            jarjestys: undefined,
            kategoriaId: "osa_a",
            linkki: "download-link-for-/nahtavillaolo/1/AineistoA.txt",
            tuotu: "2011-01-02",
          },
        ],
        lisaAineistot: [
          {
            __typename: "LadattavaTiedosto",
            nimi: "aineisto_1.txt",
            jarjestys: 2,
            linkki: "download-link-for-/lausuntopyynto/joku-uuid/aineisto_1.txt",
            tuotu: "2021-06-01T01:03",
          },
        ],
        poistumisPaiva: nyt().add(10, "day").format("YYYY-MM-DD"),
        aineistopaketti: "download-link-for-/lausuntopyynto/joku-uuid/aineistot.zip",
      };
      expect(files).to.eql(expectedFiles);
    }
  );

  it("returns dummy object when they provide correct hash and uuid, but the link has expired", async () => {
    //Set date day before poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).subtract(1, "day").format());
    const hash = adaptLausuntoPyynnot(projekti, [lausuntoPyynto1])?.[0]?.hash;
    assertIsDefined(hash);
    //Set date day after poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).add(1, "day").format());
    const actualResult = await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot({
      oid: "1",
      listaaLausuntoPyyntoTiedostotInput: { hash, lausuntoPyyntoUuid: lausuntoPyynto1.uuid },
    });
    expect(actualResult).to.eql({
      __typename: "LadattavatTiedostot",
      poistumisPaiva: lausuntoPyynto1.poistumisPaiva,
      linkkiVanhentunut: true,
      projektipaallikonYhteystiedot: {
        __typename: "ProjektiKayttajaJulkinen",
        projektiPaallikko: true,
        etunimi: "Etunimi",
        sukunimi: "Sukunimi",
        email: "email@email.com",
        puhelinnumero: "0123456789",
        organisaatio: "Organisaatio",
        elyOrganisaatio: API.ELY.HAME_ELY,
      },
    });
  });

  it("does not return lausuntoPyynto nor nahtavillaolo files for user, when they provide wrong hash", async () => {
    //Set date day before poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynto1.poistumisPaiva).subtract(1, "day").format());
    const hash = adaptLausuntoPyynnot(projekti, [lausuntoPyynto1])?.[0]?.hash;
    assertIsDefined(hash);
    await expect(
      tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot({
        oid: "1",
        listaaLausuntoPyyntoTiedostotInput: { hash: "wong hash", lausuntoPyyntoUuid: lausuntoPyynto1.uuid },
      })
    ).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("returns correct lausuntoPyynnonTaydennys files for user, when they provide correct hash and uuid, and the link has not expired", async () => {
    //Set date day before poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynnonTaydennys1.poistumisPaiva).subtract(1, "day").format());
    const hash = adaptLausuntoPyynnonTaydennykset(projekti, [lausuntoPyynnonTaydennys1])?.[0]?.hash;
    assertIsDefined(hash);
    const files = await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTaydennysTiedostot({
      oid: "1",
      listaaLausuntoPyynnonTaydennyksenTiedostotInput: { hash, lausuntoPyynnonTaydennysUuid: lausuntoPyynnonTaydennys1.uuid },
    });
    // Should contain all files from specified lausuntoPyynto and all files from latest public nahtavillaoloVaiheJulkaisu
    const expectedFiles = {
      __typename: "LadattavatTiedostot",
      kunta: 1,
      muistutukset: [
        {
          __typename: "LadattavaTiedosto",
          nimi: `tiedosto_1.txt`,
          jarjestys: 1,
          linkki: "download-link-for-/lausuntopyynnon_taydennys/joku-kolmas-uuid/tiedosto_1.txt",
          tuotu: "2021-06-01T01:01",
        },
      ],
      muutAineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_3.txt",
          jarjestys: 2,
          linkki: "download-link-for-/lausuntopyynnon_taydennys/joku-kolmas-uuid/aineisto_3.txt",
          tuotu: "2021-06-01T01:03",
        },
      ],
      poistumisPaiva: "2022-01-01",
      aineistopaketti: "download-link-for-/lausuntopyynnon_taydennys/joku-kolmas-uuid/aineistot.zip",
    };
    expect(files).to.eql(expectedFiles);
  });

  it("returns dummy object when they provide correct hash and uuid, but the link has expired", async () => {
    //Set date day before poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynnonTaydennys1.poistumisPaiva).subtract(1, "day").format());
    const hash = adaptLausuntoPyynnonTaydennykset(projekti, [lausuntoPyynnonTaydennys1])?.[0]?.hash;
    assertIsDefined(hash);
    //Set date day after poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynnonTaydennys1.poistumisPaiva).add(1, "day").format());
    const actualResult = await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTaydennysTiedostot({
      oid: "1",
      listaaLausuntoPyynnonTaydennyksenTiedostotInput: { hash, lausuntoPyynnonTaydennysUuid: lausuntoPyynnonTaydennys1.uuid },
    });
    expect(actualResult).to.eql({
      __typename: "LadattavatTiedostot",
      poistumisPaiva: lausuntoPyynnonTaydennys1.poistumisPaiva,
      linkkiVanhentunut: true,
      projektipaallikonYhteystiedot: {
        __typename: "ProjektiKayttajaJulkinen",
        projektiPaallikko: true,
        etunimi: "Etunimi",
        sukunimi: "Sukunimi",
        email: "email@email.com",
        puhelinnumero: "0123456789",
        organisaatio: "Organisaatio",
        elyOrganisaatio: API.ELY.HAME_ELY,
      },
    });
  });

  it("not not return lausuntoPyynnonTaydennys files for user, when they provide wrong hash", async () => {
    //Set date day before poistumisPaiva
    MockDate.set(parseDate(lausuntoPyynnonTaydennys1.poistumisPaiva).subtract(1, "day").format());
    const hash = adaptLausuntoPyynnonTaydennykset(projekti, [lausuntoPyynnonTaydennys1])?.[0]?.hash;
    assertIsDefined(hash);
    await expect(
      tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTaydennysTiedostot({
        oid: "1",
        listaaLausuntoPyynnonTaydennyksenTiedostotInput: {
          hash: "wong hash",
          lausuntoPyynnonTaydennysUuid: lausuntoPyynnonTaydennys1.uuid,
        },
      })
    ).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("returns lausuntoPyynto and nahtavillaolo files for preview/esikatselu", async () => {
    const lausuntoPyyntoInput: API.LausuntoPyyntoInput = {
      ...lausuntoPyynto1,
      lisaAineistot: [
        {
          nimi: `aineisto_1.txt`,
          tila: API.LadattuTiedostoTila.VALMIS,
          jarjestys: 2,
          tiedosto: "/lausuntopyynto/joku-uuid/aineisto_1.txt",
          uuid: "A1",
        },
        {
          nimi: `aineisto_uusi.txt`,
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          jarjestys: 3,
          tiedosto: "joku-hassu-polku/124223535235.txt",
          uuid: "UUSI",
        },
      ],
    };
    const files = await tiedostoDownloadLinkHandler.esikatseleLausuntoPyynnonTiedostot({
      oid: "1",
      lausuntoPyynto: lausuntoPyyntoInput,
    });
    const expectedFiles = {
      __typename: "LadattavatTiedostot",
      aineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "TiedostoA.txt",
          jarjestys: undefined,
          kategoriaId: "osa_a",
          linkki: "download-link-for-/nahtavillaolo/1/AineistoA.txt",
          tuotu: "2011-01-02",
        },
      ],
      lisaAineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_1.txt",
          jarjestys: 2,
          linkki: "download-link-for-/lausuntopyynto/joku-uuid/aineisto_1.txt",
          tuotu: "2021-06-01T01:03",
        },
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_uusi.txt",
          jarjestys: 3,
          linkki: "",
          tuotu: undefined,
        },
      ],
      poistumisPaiva: "2022-01-01",
      aineistopaketti: "(esikatselu)",
    };
    expect(files).to.eql(expectedFiles);
  });

  it("returns lausuntoPyynnonTaydennys files for preview/esikatselu", async () => {
    const lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput = {
      ...lausuntoPyynnonTaydennys1,
      muistutukset: [
        {
          tiedosto: `joku-hassu-polku/124235235.txt`,
          nimi: `tiedosto_2.txt`,
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          jarjestys: 2,
          uuid: "T2",
        },
        {
          tiedosto: `/lausuntopyynnon_taydennys/joku-kolmas-uuid/tiedosto_1.txt`,
          nimi: `tiedosto_1.txt`,
          tila: API.LadattuTiedostoTila.VALMIS,
          jarjestys: 1,
          uuid: "T1",
        },
      ],
      muuAineisto: [
        {
          nimi: `aineisto_4.txt`,
          tila: API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA,
          jarjestys: 1,
          tiedosto: "joku-hassu-polku/235345345t.txt",
          uuid: "A4",
        },
        {
          nimi: `aineisto_3.txt`,
          tila: API.LadattuTiedostoTila.VALMIS,
          jarjestys: 2,
          tiedosto: `/lausuntopyynnon_taydennys/joku-kolmas-uuid/aineisto_3.txt`,
          uuid: "A3",
        },
      ],
    };
    const files = await tiedostoDownloadLinkHandler.esikatseleLausuntoPyynnonTaydennysTiedostot({
      oid: "1",
      lausuntoPyynnonTaydennys: lausuntoPyynnonTaydennysInput,
    });
    const expectedFiles = {
      __typename: "LadattavatTiedostot",
      kunta: 1,
      muutAineistot: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_4.txt",
          jarjestys: 1,
          linkki: "",
          tuotu: undefined,
        },
        {
          __typename: "LadattavaTiedosto",
          nimi: "aineisto_3.txt",
          jarjestys: 2,
          linkki: "download-link-for-/lausuntopyynnon_taydennys/joku-kolmas-uuid/aineisto_3.txt",
          tuotu: "2021-06-01T01:03",
        },
      ],
      muistutukset: [
        {
          __typename: "LadattavaTiedosto",
          nimi: "tiedosto_1.txt",
          jarjestys: 1,
          linkki: "download-link-for-/lausuntopyynnon_taydennys/joku-kolmas-uuid/tiedosto_1.txt",
          tuotu: "2021-06-01T01:01",
        },
        {
          __typename: "LadattavaTiedosto",
          nimi: "tiedosto_2.txt",
          jarjestys: 2,
          linkki: "",
          tuotu: undefined,
        },
      ],
      poistumisPaiva: "2022-01-01",
      aineistopaketti: "(esikatselu)",
    };
    expect(files).to.eql(expectedFiles);
  });
});

const nahtavillaolo: NahtavillaoloVaihe = {
  id: 2,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoC.txt",
      tiedosto: "/nahtavillaolo/2/AineistoC.txt",
      kategoriaId: "osa_a",
      uuid: "C",
    },
  ],
};

const nahtavillaoloJulkaisu1: NahtavillaoloVaiheJulkaisu = {
  id: 1,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoA.txt",
      tiedosto: "/nahtavillaolo/1/AineistoA.txt",
      kategoriaId: "osa_a",
      tuotu: "2011-01-02",
      uuid: "A",
    },
  ],
  tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
  velho: { nimi: "Projekti 1" },
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  yhteystiedot: [],
  kuulutusPaiva: "2021-01-01",
  kuulutusYhteystiedot: {},
  ilmoituksenVastaanottajat: {},
  hankkeenKuvaus: { SUOMI: "" },
};

const nahtavillaoloJulkaisu2: NahtavillaoloVaiheJulkaisu = {
  id: 2,
  aineistoNahtavilla: [
    {
      tila: API.AineistoTila.VALMIS,
      dokumenttiOid: "foo",
      nimi: "TiedostoB.txt",
      tiedosto: "/nahtavillaolo/2/AineistoB.txt",
      kategoriaId: "osa_a",
      tuotu: "2011-04-02",
      uuid: "B",
    },
  ],
  tila: API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
  velho: { nimi: "Projekti 1" },
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  yhteystiedot: [],
  kuulutusPaiva: "2021-01-01",
  kuulutusYhteystiedot: {},
  ilmoituksenVastaanottajat: {},
  hankkeenKuvaus: { SUOMI: "" },
};

const lausuntoPyynto1: LausuntoPyynto = {
  uuid: "joku-uuid",
  poistumisPaiva: "2022-01-01",
  lisaAineistot: [
    {
      tiedosto: `/lausuntopyynto/joku-uuid/aineisto_1.txt`,
      nimi: `aineisto_1.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      tuotu: "2021-06-01T01:03",
      uuid: "A1",
    },
  ],
  aineistopaketti: "/lausuntopyynto/joku-uuid/aineistot.zip",
  poistetaan: true,
};

const lausuntoPyynto2: LausuntoPyynto = {
  uuid: "joku-toinen-uuid",
  poistumisPaiva: "2022-01-01",
  lisaAineistot: [
    {
      tiedosto: `/lausuntopyynto/joku-toinen-uuid/aineisto_2.txt`,
      nimi: `aineisto_2.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      tuotu: "2021-06-01T01:03",
      uuid: "A2",
    },
  ],
  aineistopaketti: "/lausuntopyynto/joku-toinen-uuid/aineistot.zip",
};

const lausuntoPyynnonTaydennys1: LausuntoPyynnonTaydennys = {
  uuid: "joku-kolmas-uuid",
  poistumisPaiva: "2022-01-01",
  muistutukset: [
    {
      tiedosto: `/lausuntopyynnon_taydennys/joku-kolmas-uuid/tiedosto_1.txt`,
      nimi: `tiedosto_1.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 1,
      tuotu: "2021-06-01T01:01",
      uuid: "T1",
    },
  ],
  muuAineisto: [
    {
      tiedosto: `/lausuntopyynnon_taydennys/joku-kolmas-uuid/aineisto_3.txt`,
      nimi: `aineisto_3.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      tuotu: "2021-06-01T01:03",
      uuid: "A3",
    },
  ],
  kunta: 1,
  aineistopaketti: "/lausuntopyynnon_taydennys/joku-kolmas-uuid/aineistot.zip",
};

const lausuntoPyynnonTaydennys2: LausuntoPyynnonTaydennys = {
  uuid: "joku-neljas-uuid",
  poistumisPaiva: "2022-01-01",
  muistutukset: [
    {
      tiedosto: `/lausuntopyynnon_taydennys/joku-neljas-uuid/tiedosto_2.txt`,
      nimi: `tiedosto_2.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 1,
      tuotu: "2021-06-01T01:01",
      uuid: "T2",
    },
  ],
  muuAineisto: [
    {
      tiedosto: `/lausuntopyynnon_taydennys/joku-neljas-uuid/aineisto_4.txt`,
      nimi: `aineisto_4.txt`,
      tila: API.LadattuTiedostoTila.VALMIS,
      jarjestys: 2,
      tuotu: "2021-06-01T01:03",
      uuid: "A4",
    },
  ],
  kunta: 2,
  aineistopaketti: "/lausuntopyynnon_taydennys/joku-neljas-uuid/aineistot.zip",
};

const projekti: DBProjekti = {
  oid: "1",
  versio: 1,
  kayttoOikeudet: [
    {
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      etunimi: "Etunimi",
      sukunimi: "Sukunimi",
      email: "email@email.com",
      kayttajatunnus: "SECRET",
      puhelinnumero: "0123456789",
      organisaatio: "Organisaatio",
      muokattavissa: false,
      yleinenYhteystieto: true,
      elyOrganisaatio: API.ELY.HAME_ELY,
    },
  ],
  salt: "salt",
  nahtavillaoloVaihe: nahtavillaolo,
  nahtavillaoloVaiheJulkaisut: [nahtavillaoloJulkaisu1, nahtavillaoloJulkaisu2],
  lausuntoPyynnot: [lausuntoPyynto1, lausuntoPyynto2],
  lausuntoPyynnonTaydennykset: [lausuntoPyynnonTaydennys1, lausuntoPyynnonTaydennys2],
  tallennettu: true,
  velho: { nimi: "Projekti 1" },
};
