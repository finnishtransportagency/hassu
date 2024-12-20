import sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { migrateFromOldSchema } from "../../src/database/projektiSchemaUpdate";
import MockDate from "mockdate";
import { lisaAineistoHandler } from "../../src/handler/lisaAineistoHandler";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../src/files/fileService";
import { expect } from "chai";

describe("LisaAineistoHandler", () => {
  it("listaaLisaAineisto will return LadattavatTiedostot when calling it  with correct parameters, and the project in in DB in the old legacy form", async () => {
    MockDate.set("2023-12-12");
    sinon.stub(projektiDatabase, "loadProjektiByOid").resolves(migrateFromOldSchema(projektiInDB));
    sinon
      .stub(fileService, "createYllapitoSignedDownloadLink")
      .callsFake((oid: string, tiedosto: string) => Promise.resolve(`latauslinkki${oid}-${tiedosto}`));
    const hash =
      "d8e3614152e76c7b060d994ec85081853f0dd0d1d5b3da651089195b72002a03bcae64b41b21d0127c72ce2b6cef47b63d91e33a6d62b0f379cff8e6bc909fdc";
    const nahtavillaoloVaiheId = 1;
    const poistumisPaiva = "2024-06-09";
    const ladattavatTiedostot = await lisaAineistoHandler.listaaLisaAineisto({
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      lisaAineistoTiedot: {
        nahtavillaoloVaiheId,
        poistumisPaiva,
        hash,
      },
    });
    const expectedResult: API.LadattavatTiedostot = {
      __typename: "LadattavatTiedostot",
      poistumisPaiva: "2024-06-09",
      nimi: "Tiesuunnitelma 1 - Karvia",
      tyyppi: API.ProjektiTyyppi.TIE,
      aineistot: [
        {
          __typename: "LadattavaTiedosto",
          kategoriaId: "osa_a",
          linkki: `latauslinkki1.2.246.578.5.1.2978288874.2711575506-/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf`,
          nimi: "Asiakirjaluettelo_osat_A-C.pdf",
          tuotu: "2023-12-12T10:34:22+02:00",
          jarjestys: 0,
        },
      ],
      lisaAineistot: [
        {
          __typename: "LadattavaTiedosto",
          jarjestys: 0,
          nimi: "aineisto4.txt",
          linkki: "latauslinkki1.2.246.578.5.1.2978288874.2711575506-/nahtavillaolo/1/aineisto4.txt",
          tuotu: "2023-12-12T10:34:36+02:00",
        },
      ],
      aineistopaketti: "latauslinkki1.2.246.578.5.1.2978288874.2711575506-/nahtavillaolo/1/aineisto.zip",
    };
    expect(ladattavatTiedostot).to.eql(expectedResult);
    MockDate.reset();
    sinon.reset();
    sinon.restore();
  });
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const projektiInDB: any = {
  oid: "1.2.246.578.5.1.2978288874.2711575506",
  asianhallinta: {
    inaktiivinen: true,
  },
  kasittelynTila: {},
  kayttoOikeudet: [],
  kielitiedot: {
    ensisijainenKieli: "SUOMI",
  },
  nahtavillaoloVaihe: {
    aineistoNahtavilla: [
      {
        dokumenttiOid: "1.2.246.578.5.100.2489125316.2057886293",
        jarjestys: 0,
        kategoriaId: "osa_a",
        nimi: "Asiakirjaluettelo_osat_A-C.pdf",
        tiedosto: "/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf",
        tila: "VALMIS",
        tuotu: "2023-12-12T10:34:22+02:00",
      },
    ],
    lisaAineisto: [
      {
        dokumenttiOid: "1.2.246.578.5.100.3042249690.1969582740",
        jarjestys: 0,
        nimi: "aineisto4.txt",
        tiedosto: "/nahtavillaolo/1/aineisto4.txt",
        tila: "VALMIS",
        tuotu: "2023-12-12T10:34:36+02:00",
      },
    ],
    aineistopaketti: "aineistot.zip",
  },
  nahtavillaoloVaiheJulkaisut: [
    {
      tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
      id: 1,
      aineistoNahtavilla: [
        {
          dokumenttiOid: "1.2.246.578.5.100.2489125316.2057886293",
          jarjestys: 0,
          kategoriaId: "osa_a",
          nimi: "Asiakirjaluettelo_osat_A-C.pdf",
          tiedosto: "/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf",
          tila: "VALMIS",
          tuotu: "2023-12-12T10:34:22+02:00",
        },
      ],
      lisaAineisto: [
        {
          dokumenttiOid: "1.2.246.578.5.100.3042249690.1969582740",
          jarjestys: 0,
          nimi: "aineisto4.txt",
          tiedosto: "/nahtavillaolo/1/aineisto4.txt",
          tila: "VALMIS",
          tuotu: "2023-12-12T10:34:36+02:00",
        },
      ],
      aineistopaketti: "/nahtavillaolo/1/aineisto.zip",
    },
  ],
  salt: "6bf729355075cf0ef460f2d46991e694",
  tyyppi: "TIE",
  vahainenMenettely: false,
  velho: { nimi: "Tiesuunnitelma 1 - Karvia", tyyppi: API.ProjektiTyyppi.TIE },
  versio: 7,
};
