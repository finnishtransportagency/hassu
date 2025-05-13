import {
  AsiakirjaTyyppi,
  ELY,
  IlmoitettavaViranomainen,
  KayttajaTyyppi,
  Kieli,
  KirjaamoOsoite,
  ProjektiTyyppi,
  SuunnittelustaVastaavaViranomainen,
} from "hassu-common/graphql/apiModel";
import { GeneratePDFEvent } from "../../../src/asiakirja/lambda/generatePDFEvent";
import { handleEvent } from "../../../src/asiakirja/lambda/pdfGeneratorHandler";
import * as sinon from "sinon";
import { parameters } from "../../../src/aws/parameters";
import { GetParameterCommand, SSM } from "@aws-sdk/client-ssm";
import { mockClient } from "aws-sdk-client-mock";
import { expect } from "chai";
import fs from "fs";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { fileService } from "../../../src/files/fileService";

const kirjaamoOsoitteet: KirjaamoOsoite[] = [
  { __typename: "KirjaamoOsoite", nimi: IlmoitettavaViranomainen.VAYLAVIRASTO, sahkoposti: "kirjaamo@vayla.fi" },
  { __typename: "KirjaamoOsoite", nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY, sahkoposti: "kirjaamo@ely.fi" },
];

type PdfEvent = {
  kieli: KaannettavaKieli;
  ensisijainenKieli: KaannettavaKieli;
  suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen;
  tyyppi: ProjektiTyyppi;
  lisaaOsoite: boolean;
  eunRahoittama: boolean;
  toissijainenKieli?: KaannettavaKieli;
  vahainenMenettely?: boolean;
  vanha?: boolean;
};

function pdfFileName({ tyyppi, kieli }: PdfEvent) {
  if (tyyppi === ProjektiTyyppi.TIE) {
    return `T415 Ilmoitus kiinteistonomistajille nahtaville asettamisesta${kieli === Kieli.RUOTSI ? " sv" : ""}.pdf`;
  } else if (tyyppi === ProjektiTyyppi.RATA) {
    return `R415 Ilmoitus kiinteistonomistajille nahtaville asettamisesta${kieli === Kieli.RUOTSI ? " sv" : ""}.pdf`;
  } else {
    return `Y415 Ilmoitus kiinteistonomistajille nahtaville asettamisesta${kieli === Kieli.RUOTSI ? " sv" : ""}.pdf`;
  }
}

function testPdfFileName({
  tyyppi,
  kieli,
  suunnittelustaVastaavaViranomainen,
  vahainenMenettely,
  lisaaOsoite,
  vanha,
  eunRahoittama,
}: PdfEvent) {
  return (
    __dirname +
    `/${tyyppi.toLocaleLowerCase()}_${
      suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO ? "vayla" : "ely"
    }${lisaaOsoite && !vanha ? "_osoite" : ""}${vahainenMenettely ? "_vahainen" : ""}${eunRahoittama ? "_eu" : ""}${vanha ? "_vanha" : ""}${
      kieli === Kieli.RUOTSI ? "_sv" : ""
    }.pdf`
  );
}

function generateEvent(event: PdfEvent): GeneratePDFEvent {
  return {
    createNahtavillaoloKuulutusPdf: {
      asiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      asianhallintaPaalla: false,
      kuulutettuYhdessaSuunnitelmanimi: undefined,
      kayttoOikeudet: [
        {
          etunimi: "Teppo",
          sukunimi: "Projektipäällikkö",
          email: "teppo@vayla.fi",
          kayttajatunnus: "XXX",
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          organisaatio:
            event.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO ? "Väylävirasto" : "ELY",
          elyOrganisaatio: ELY.UUDENMAAN_ELY,
        },
      ],
      kieli: event.kieli,
      linkkiAsianhallintaan: undefined,
      luonnos: false,
      lyhytOsoite: "lyhytOsoite",
      nahtavillaoloVaihe: {
        id: 1,
        kielitiedot: {
          ensisijainenKieli: event.ensisijainenKieli,
          toissijainenKieli: event.toissijainenKieli,
          projektinNimiVieraskielella: "Projekti 1 på svenska",
        },
        kuulutusYhteystiedot: {},
        velho: {
          nimi: "Projekti 1",
        },
        kuulutusVaihePaattyyPaiva: "2024-02-08",
        kuulutusPaiva: "2024-01-01",
        hankkeenKuvaus: {
          SUOMI: "Hankkeen kuvaus",
          RUOTSI: "Hankkeen kuvaus på svenska",
        },
        yhteystiedot: [
          {
            etunimi: "Testi",
            sukunimi: "Teppo",
            kunta: 91,
            puhelinnumero: "029",
            sahkoposti: "test@vayla.fi",
          },
        ],
      },
      oid: "1.2.3",
      velho: {
        nimi: "Projekti 1",
        asiatunnusELY: "ELY/456",
        asiatunnusVayla: "VAYLA/123",
        tyyppi: event.tyyppi,
        kunnat: [91],
        suunnittelustaVastaavaViranomainen: event.suunnittelustaVastaavaViranomainen,
        vaylamuoto: ["tie", "rata"],
      },
      vahainenMenettely: event.vahainenMenettely,
      euRahoitusLogot: event.eunRahoittama
        ? {
            SUOMI: "xxx",
            RUOTSI: "yyy",
          }
        : undefined,
      suunnitteluSopimus: {
        kunta: 91,
        logo: { SUOMI: "xxx", RUOTSI: "yyy" },
        yhteysHenkilo: "",
      },
      osoite: event.lisaaOsoite
        ? {
            nimi: "Tessa Testilä",
            katuosoite: "Henrikintie 14 B",
            postinumero: "00370",
            postitoimipaikka: "HELSINKI",
          }
        : undefined,
    },
  };
}

describe("pdfGeneratorHandler", () => {
  let parameterStub: sinon.SinonStub;
  before(() => {
    parameterStub = sinon.stub(parameters, "isSuomiFiViestitIntegrationEnabled");
    mockClient(SSM)
      .on(GetParameterCommand, { Name: "/kirjaamoOsoitteet" })
      .resolves({ Parameter: { Value: JSON.stringify(kirjaamoOsoitteet) } });
    sinon.stub(fileService, "getProjektiFile").resolves(fs.readFileSync(__dirname + "/eulogo.jpg"));
  });
  after(() => {
    sinon.restore();
  });
  beforeEach(() => {
    parameterStub.resolves(true);
  });
  it("generate kiinteiston omistaja pdf tie vaylavirasto osoitetiedoilla", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.TIE,
      lisaaOsoite: true,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf tie vaylavirasto ei osoitetta", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.TIE,
      lisaaOsoite: false,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf rata vaylavirasto osoitetiedoilla", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.RATA,
      lisaaOsoite: true,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf yleinen vaylavirasto osoitetiedoilla", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.YLEINEN,
      lisaaOsoite: true,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf tie vaylavirasto osoitetiedoilla ruotsi", async () => {
    const event: PdfEvent = {
      kieli: Kieli.RUOTSI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.TIE,
      lisaaOsoite: true,
      eunRahoittama: false,
      toissijainenKieli: Kieli.RUOTSI,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf rata vaylavirasto osoitetiedoilla ruotsi", async () => {
    const event: PdfEvent = {
      kieli: Kieli.RUOTSI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.RATA,
      lisaaOsoite: true,
      eunRahoittama: false,
      toissijainenKieli: Kieli.RUOTSI,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf yleinen vaylavirasto osoitetiedoilla ruotsi", async () => {
    const event: PdfEvent = {
      kieli: Kieli.RUOTSI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.YLEINEN,
      lisaaOsoite: true,
      eunRahoittama: false,
      toissijainenKieli: Kieli.RUOTSI,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf tie ely osoitetiedoilla eu", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
      tyyppi: ProjektiTyyppi.TIE,
      lisaaOsoite: true,
      eunRahoittama: true,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf rata ely osoitetiedoilla", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
      tyyppi: ProjektiTyyppi.RATA,
      lisaaOsoite: true,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf yleinen ely osoitetiedoilla", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
      tyyppi: ProjektiTyyppi.YLEINEN,
      lisaaOsoite: true,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf rata ely ei osoitetta", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
      tyyppi: ProjektiTyyppi.RATA,
      lisaaOsoite: false,
      eunRahoittama: false,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });

  it("generate kiinteiston omistaja pdf tie vaylavirasto osoitetiedoilla vahainen menettely", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.TIE,
      lisaaOsoite: true,
      eunRahoittama: false,
      vahainenMenettely: true,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf rata vaylavirasto osoitetiedoilla vahainen menettely", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.RATA,
      lisaaOsoite: true,
      eunRahoittama: false,
      vahainenMenettely: true,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf yleinen vaylavirasto osoitetiedoilla vahainen menettely", async () => {
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.YLEINEN,
      lisaaOsoite: true,
      eunRahoittama: false,
      vahainenMenettely: true,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName(event), Buffer.from(pdf.sisalto, "base64"));
  });
  it("generate kiinteiston omistaja pdf tie vaylavirasto vanha", async () => {
    parameterStub.resolves(false);
    const event: PdfEvent = {
      kieli: Kieli.SUOMI,
      ensisijainenKieli: Kieli.SUOMI,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      tyyppi: ProjektiTyyppi.TIE,
      lisaaOsoite: true,
      eunRahoittama: false,
      vahainenMenettely: true,
    };
    const pdf = await handleEvent(generateEvent(event));
    expect(pdf.textContent).toMatchSnapshot();
    expect(pdf.nimi).to.equal(pdfFileName(event));
    fs.writeFileSync(testPdfFileName({ ...event, vanha: true }), Buffer.from(pdf.sisalto, "base64"));
  });
});
