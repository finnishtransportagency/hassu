import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS_FILES } from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, insertYllapitoFileToS3 } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { TEST_PROJEKTI, TEST_PROJEKTI_FILES } from "./TEST_PROJEKTI";
import * as API from "hassu-common/graphql/apiModel";
import { esikatseleHyvaksymisEsityksenTiedostot } from "../../src/HyvaksymisEsitys/actions";
import { expect } from "chai";
import { adaptFileName } from "../../src/tiedostot/paths";
import { TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO } from "./TEST_HYVAKSYMISESITYS_INPUT";
import omit from "lodash/omit";
import { DBProjekti, JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../../src/database/model";

describe("Hyväksymisesityksen tiedostojen esikatselu", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
  });

  beforeEach(async () => {
    // Aseta projektille tiedostoja S3:een
    await Promise.all(
      TEST_PROJEKTI_FILES.map(async ({ tiedosto }) => {
        const path = `yllapito/tiedostot/projekti/${oid}${tiedosto}`;
        await insertYllapitoFileToS3(path);
      })
    );
    // Aseta muokattavalle hyväksymisesitykselle tiedostoja S3:een.
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    // Aseta julkaistulle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
  });

  afterEach(async () => {
    // Poista projektin tiedostot joka testin päätteeksi
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}`);
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("antaa oikeat tiedostot", async () => {
    /**
     * Testataan, että esikatselussa tulee oikea tiedosto esille.
     * Laitetaan siksi db:n muokattavan hyväksymiseistyksen yksi tiedosto
     * eriksi kuin julkaistun hyväksymisesityksen.
     */
    const alternativeHyvaksymisEsitysName = `hyvaksymisEsitys äöå ALTERNATIVE.png`;
    const alternativeHyvaksymisEsitysUuid = `hyvaksymis-esitys-uuid-ALT`;
    await insertYllapitoFileToS3(
      `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/hyvaksymisEsitys/${adaptFileName(alternativeHyvaksymisEsitysName)}`
    );
    const projektiInDB = {
      ...TEST_PROJEKTI,
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksymisEsitys: [
          {
            nimi: alternativeHyvaksymisEsitysName,
            uuid: alternativeHyvaksymisEsitysUuid,
            lisatty: "2022-01-02T02:00:00+02:00",
          },
        ],
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    /**
     * Laitetaan inputiin dataa, joka ei ole vielä DB:ssä.
     * Sen pitäisi tulla esikatseluun näkyviin.
     */
    const alternativeMuistutuksetName = "muistutukset äöå 2.png";
    const alternativeMuuAineistoVelhostaName = "muuAineistoVelhosta äöå 2.png";
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      hyvaksymisEsitys: [
        {
          nimi: alternativeHyvaksymisEsitysName,
          uuid: alternativeHyvaksymisEsitysUuid,
        },
      ],
      // eri kuin db:ssä
      muistutukset: [
        {
          kunta: 2,
          nimi: alternativeMuistutuksetName,
          uuid: "muistutukset-esitys-uuid-TALLENTAMATON",
        },
      ],
      // eri kuin db:ssä
      muuAineistoVelhosta: [
        {
          dokumenttiOid: "muuAineistoVelhostaDokumenttiOid-UUSI",
          nimi: alternativeMuuAineistoVelhostaName,
          uuid: "muuAineistoVelhosta-uuid-TALLENTAMATON",
        },
      ],
    };
    const ladattavatTiedostot = await esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    /**
     * Kerätään saadut tiedostot kasaan.
     */
    const ladattavatTiedostotList = Object.values(ladattavatTiedostot).reduce((acc, value) => {
      if (Array.isArray(value)) {
        acc.push(...(value as API.LadattavaTiedosto[] | API.KunnallinenLadattavaTiedosto[]));
      }
      return acc;
    }, [] as (API.LadattavaTiedosto | API.KunnallinenLadattavaTiedosto)[]);
    const nimet = ladattavatTiedostotList.map(({ nimi }) => nimi);
    /**
     * Tiedostojen joukossa ei pitäisi olla tässä poisfiltteröityjä tiedostoja,
     * mutta kaikki muu pitäisi olla. Lisäksi pitäisi olla lopussa mainitut kolme tiedostoa,
     * jotka asetimme testissä.
     */
    const expectedFileNames = [
      ...TEST_PROJEKTI_FILES.filter(({ nimi }) => !nimi.match(/se\.pdf$/)) // ei saametiedostoja
        .map((file) => file.nimi)
        .filter((nimi) => !nimi.includes("lähetekirje"))
        .filter((nimi) => !nimi.includes("vuorovaikutusaineisto"))
        .filter((nimi) => !nimi.includes("nähtävilläoloaineisto")),
      ...TEST_HYVAKSYMISESITYS_FILES.filter(({ nimi }) => !nimi.match(/se\.pdf$/)) // ei saametiedostoja
        .map((file) => file.nimi)
        .filter((nimi) => !nimi.includes("hyvaksymisEsitys"))
        .filter((nimi) => !nimi.includes("muistutukset"))
        .filter((nimi) => !nimi.includes("muuAineistoVelhosta")),
      alternativeHyvaksymisEsitysName,
      alternativeMuistutuksetName,
      alternativeMuuAineistoVelhostaName,
    ];
    expect(nimet.sort()).to.eql(expectedFileNames.sort());
  });

  it("ei mene sekaisin siitä, että aloituskuulutuksella on tyhjä objekti pohjoissaame-pdf:ssä", async () => {
    const projektiInDB = {
      ...TEST_PROJEKTI,
      aloitusKuulutuJulkaisut: [
        {
          ...TEST_PROJEKTI.aloitusKuulutusJulkaisut?.[0],
          /**
           * Tämänmuotoista dataa on oikeasti DB:ssä projektille,
           * joka EI ole saamenkielinen
           */
          aloituskuulutusSaamePDFt: {
            POHJOISSAAME: {},
          },
        },
      ],
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
    };
    const kutsu = esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    await expect(kutsu).to.be.eventually.fulfilled;
  });

  it("antaa oikeat lisätiedot projektille", async () => {
    const projektiInDB = {
      ...TEST_PROJEKTI,
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
    };
    const tiedot = await esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    expect(tiedot.perustiedot.suunnitelmanNimi).to.eql("Projektin nimi");
    expect(tiedot.perustiedot.asiatunnus).to.eql("asiatunnusVayla");
    expect(tiedot.perustiedot.yTunnus).to.eql("1010547-1");
    expect(tiedot.perustiedot.kunnat).to.eql([91, 92]);
    expect(tiedot.perustiedot.vastuuorganisaatio).to.eql(API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO);
    expect(tiedot.projektipaallikonYhteystiedot).to.eql({
      __typename: "ProjektiKayttajaJulkinen",
      elyOrganisaatio: undefined,
      email: "email@email.com",
      etunimi: "Etunimi",
      organisaatio: undefined,
      projektiPaallikko: true,
      puhelinnumero: undefined,
      sukunimi: "Sukunimi",
    });
  });

  it("antaa oikeat lisätiedot ELY projektille", async () => {
    const projektiInDB = {
      ...TEST_PROJEKTI,
      velho: {
        ...TEST_PROJEKTI.velho,
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
        asiatunnusELY: "asiatunnusELY",
      },
      versio: 1,
      kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI, toissijainenKieli: undefined },
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
    };
    const tiedot = await esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    expect(tiedot.perustiedot.suunnitelmanNimi).to.eql("Projektin nimi");
    expect(tiedot.perustiedot.asiatunnus).to.eql("asiatunnusELY");
    expect(tiedot.perustiedot.yTunnus).to.eql("2296962-1");
    expect(tiedot.perustiedot.kunnat).to.eql([91, 92]);
    expect(tiedot.perustiedot.vastuuorganisaatio).to.eql(API.SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY);
    expect(tiedot.projektipaallikonYhteystiedot).to.eql({
      __typename: "ProjektiKayttajaJulkinen",
      elyOrganisaatio: undefined,
      email: "email@email.com",
      etunimi: "Etunimi",
      organisaatio: undefined,
      projektiPaallikko: true,
      puhelinnumero: undefined,
      sukunimi: "Sukunimi",
    });
  });

  it("antaa oikeat lisätiedot hyväksymisesitykselle", async () => {
    const projektiInDB = {
      ...TEST_PROJEKTI,
      muokattavaHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        tila: API.HyvaksymisTila.MUOKKAUS,
      },
      julkaistuHyvaksymisEsitys: {
        ...TEST_HYVAKSYMISESITYS,
        /**
         * Laitetaan eri poistumospäivä julkaistulle kuin muokattavalle
         */
        poistumisPaiva: "2099-01-01",
        hyvaksyja: "theadminuid",
        hyvaksymisPaiva: "2022-01-01",
      },
    };
    await insertProjektiToDB(projektiInDB);
    userFixture.loginAsAdmin();
    const input: API.HyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      /**
       * Laitetaan inputiin eri lisätieto kuin DB:ssä
       */
      lisatiedot: "Kissa",
    };
    const tiedot = await esikatseleHyvaksymisEsityksenTiedostot({ oid, hyvaksymisEsitys: input });
    expect(tiedot.poistumisPaiva).to.eq("2033-01-01"); // Sama kuin muokattavalla ja inputissa
    expect(tiedot.lisatiedot).to.eql("Kissa"); // Sama kuin inputissa
    expect(omit(tiedot.laskutustiedot, "__typename")).to.eql(TEST_HYVAKSYMISESITYS.laskutustiedot);
  });
});
