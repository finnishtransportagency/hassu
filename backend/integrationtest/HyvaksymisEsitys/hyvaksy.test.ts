import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, DBVaylaUser, MuokattavaHyvaksymisEsitys } from "../../src/database/model";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, {
  TEST_HYVAKSYMISESITYS2,
  TEST_HYVAKSYMISESITYS_FILES,
  TEST_HYVAKSYMISESITYS_FILES2,
} from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, getYllapitoFilesUnderPath, insertYllapitoFileToS3 } from "./util";
import { hyvaksyHyvaksymisEsitys } from "../../src/HyvaksymisEsitys/actions";
import { omit } from "lodash";
import { expect } from "chai";
import { UserFixture } from "../../test/fixture/userFixture";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
import { emailClient } from "../../src/email/email";
import { EmailOptions } from "../../src/email/model/emailOptions";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { parameters } from "../../src/aws/parameters";
import MockDate from "mockdate";

describe("Hyväksymisesityksen hyväksyminen", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  const oid = "Testi1";
  let emailStub: sinon.SinonStub<[options: EmailOptions], Promise<SMTPTransport.SentMessageInfo | undefined>> | undefined;

  // Sähköpostin lähettämistä varten projektilla on oltava kayttoOikeudet ja velho
  const kayttoOikeudet = [
    {
      etunimi: "Etunimi",
      sukunimi: "Sukunimi",
      email: "email@email.com",
      kayttajatunnus: "theadminuid",
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      elyOrganisaatio: API.ELY.HAME_ELY,
      puhelinnumero: "0291234567",
    },
    {
      etunimi: "Etunimi2",
      sukunimi: "Sukunimi2",
      email: "email2@email.com",
      kayttajatunnus: "theadminuid",
      tyyppi: API.KayttajaTyyppi.VARAHENKILO,
    },
    {
      etunimi: "Matti",
      sukunimi: "Muokkaaja",
      email: "muokkaaja@email.com",
      kayttajatunnus: "muokkaaja-oid",
    },
  ];

  const velho = {
    nimi: "Projektin nimi",
    asiatunnusELY: "asiatunnusELY",
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.LAPIN_ELY,
    kunnat: [91, 92],
  };

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);

    // Stubataan sähköpostin lähettäminen
    emailStub = sinon.stub(emailClient, "sendEmail");

    // Stubataan parametrien hakeminen aws:stä
    const getParameterStub = sinon.stub(parameters, "getParameter");

    getParameterStub.callsFake((paramName) => {
      if (paramName == "AsianhallintaIntegrationEnabled") {
        return Promise.resolve("true");
      }
      if (paramName == "UspaIntegrationEnabled") {
        return Promise.resolve("true");
      }
      return Promise.resolve("getParameterValue_" + paramName);
    });
  });

  beforeEach(async () => {
    // Aseta muokattavalle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${path}`;
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
    emailStub?.reset();
    MockDate.reset();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn ja s.postin lähetystiedot", async () => {
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet,
      velho,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect({
      ...omit(projektiAfter, "paivitetty"),
      julkaistuHyvaksymisEsitys: omit(projektiAfter.julkaistuHyvaksymisEsitys, "hyvaksymisPaiva"),
    }).to.eql({
      ...projektiBefore,
      versio: versio + 1,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitys, tila: API.HyvaksymisTila.HYVAKSYTTY, palautusSyy: null },
      julkaistuHyvaksymisEsitys: {
        ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]),
        hyvaksyja: "theadminuid",
        vastaanottajat: [
          {
            lahetetty: "2000-01-01T02:00:00+02:00",
            lahetysvirhe: false,
            sahkoposti: "vastaanottaja@sahkoposti.fi",
          },
        ],
      },
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("merkitsee sähköpostin lähetystietoihin lähetysvirheen, jos sellainen tapahtuu", async () => {
    MockDate.set("2000-01-01");
    emailStub?.onFirstCall().throws();
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet,
      velho,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.julkaistuHyvaksymisEsitys.vastaanottajat).to.eql([
      {
        sahkoposti: "vastaanottaja@sahkoposti.fi",
        lahetysvirhe: true,
      },
    ]);
  });

  it("lähettää oikeat s.postit kun tarvitaan kiireellistä käsittelyä ja asianhallinta ei ole aktiivinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          organisaatio: "Pupulandia",
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
        },
      ],
      asianhallinta: {
        inaktiivinen: true,
      },
      velho: {
        nimi: "Projektin nimi",
        asiatunnusVayla: "asiatunnusVayla",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        kunnat: [91, 92],
      },
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });

    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusProjarille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("email@email.com") && to.includes("email2@email.com");
    });
    expect(ilmoitusProjarille).to.exist;
    expect(ilmoitusProjarille?.firstArg).toMatchSnapshot();

    const ilmoitusMuokkaajalle = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return to == "muokkaaja@email.com";
    });
    expect(ilmoitusMuokkaajalle).to.exist;
    expect(ilmoitusMuokkaajalle?.firstArg).toMatchSnapshot();

    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(ilmoitusVastaanottajille).to.exist;
    expect(omit(ilmoitusVastaanottajille?.firstArg, "attachments")).toMatchSnapshot();
    expect(ilmoitusVastaanottajille?.firstArg.attachments?.length).to.eql(1);
    expect(ilmoitusVastaanottajille?.firstArg.attachments[0].filename).to.eql("hyvaksymisEsitys_aoa_.png");
  });

  it("lähettää oikeat s.postit kun EI tarvita kiireellistä käsittelyä ja asianhallinta on aktiivinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          elyOrganisaatio: API.ELY.HAME_ELY,
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
        },
      ],
      velho: {
        nimi: "Projektin nimi",
        asiatunnusELY: "asiatunnusELY",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.LAPIN_ELY,
        kunnat: [91, 92],
      },
      asianhallinta: {
        inaktiivinen: false,
        asiaId: 14,
      },
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusProjarille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("email@email.com") && to.includes("email2@email.com");
    });
    expect(ilmoitusProjarille).to.exist;
    expect(ilmoitusProjarille?.firstArg).toMatchSnapshot();
    expect(/getParameterValue_UspaBaseUrl\/Asia\.aspx\?AsiaId=14/.test((ilmoitusProjarille?.firstArg as EmailOptions).text as string)).to.be
      .true; // "includes" ei toiminut tässä erikoismerkkien takia

    const ilmoitusMuokkaajalle = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return to == "muokkaaja@email.com";
    });
    expect(ilmoitusMuokkaajalle).to.exist;
    expect(ilmoitusMuokkaajalle?.firstArg).toMatchSnapshot();

    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(omit(ilmoitusVastaanottajille?.firstArg, "attachments")).toMatchSnapshot();
    expect(ilmoitusVastaanottajille?.firstArg.attachments?.length).to.eql(1);
    expect(ilmoitusVastaanottajille?.firstArg.attachments[0].filename).to.eql("hyvaksymisEsitys_aoa_.png");
  });

  it("näyttää oikeat tiedot s.postissa, kun vastaava viranomainen on ELY-keskus ja projarin organisaatio on ELY", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          elyOrganisaatio: API.ELY.HAME_ELY,
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
        },
      ],
      asianhallinta: {
        inaktiivinen: true,
      },
      velho: {
        nimi: "Projektin nimi",
        asiatunnusELY: "asiatunnusELY",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.LAPIN_ELY,
        kunnat: [91, 92],
      },
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Asiatunnus\n\nasiatunnusELY")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Vastuuorganisaatio\n\nLapin ELY-keskus")).to.be
      .true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Y-tunnus\n\n2296962-1")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Etunimi Sukunimi Hämeen ELY-keskus")).to.be.true;
  });

  it("näyttää oiketa tiedot s.postissa, kun vastaava viranomainen on Väylävirasto ja projarin organisaatio on Väylävirasto ja asianhallinta on aktiivinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
        },
      ],
      velho: {
        nimi: "Projektin nimi",
        asiatunnusELY: "asiatunnusELY",
        asiatunnusVayla: "asiatunnusVAYLA",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        kunnat: [91, 92],
      },
      asianhallinta: {
        inaktiivinen: false,
        asiaId: "asiaId",
      },
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusProjarille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("email@email.com") && to.includes("email2@email.com");
    });
    expect(ilmoitusProjarille).to.exist;
    expect(
      /getParameterValue_AshaBaseUrl\/group\/asianhallinta\/asianhallinta\/-\/case\/asiaId\/view/.test(
        (ilmoitusProjarille?.firstArg as EmailOptions).text as string
      )
    ).to.be.true; // "includes" ei toiminut tässä erikoismerkkien takia

    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Asiatunnus\n\nasiatunnusVAYLA")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Vastuuorganisaatio\n\nVäylävirasto")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Y-tunnus\n\n1010547-1")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Etunimi Sukunimi Väylävirasto")).to.be.true;
  });

  it("näyttää oiketa tiedot s.postissa, kun vastaava viranomainen on Väylävirasto ja projarin organisaatio on Väylävirasto ja asianhallinta on aktiivinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const versio = 2;
    const projektiBefore: DBProjekti = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys: muokattavaHyvaksymisEsitys as unknown as MuokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
          organisaatio: "Organisaatio1",
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
          organisaatio: "Organisaatio1",
        },
      ],
      velho: {
        nimi: "Projektin nimi",
        asiatunnusELY: "asiatunnusELY",
        asiatunnusVayla: "asiatunnusVAYLA",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        kunnat: [91, 92],
      },
      asianhallinta: {
        inaktiivinen: false,
        asiaId: 14,
      },
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusProjarille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("email@email.com") && to.includes("email2@email.com");
    });
    expect(ilmoitusProjarille).to.exist;
    expect(
      /getParameterValue_AshaBaseUrl\/group\/asianhallinta\/asianhallinta\/-\/case\/14\/view/.test(
        (ilmoitusProjarille?.firstArg as EmailOptions).text as string
      )
    ).to.be.true; // "includes" ei toiminut tässä erikoismerkkien takia

    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Sähköpostin liitteenä on myös hyväksymisesitys"))
      .to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Asiatunnus\n\nasiatunnusVAYLA")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Vastuuorganisaatio\n\nVäylävirasto")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Y-tunnus\n\n1010547-1")).to.be.true;
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Etunimi Sukunimi Väylävirasto")).to.be.true;
  });

  it("sähköpostissa ei lue 'liitteenä hyväksymisesitys', jos hyväksymisesityksellä ei ole hyväksymisesitystiedostoa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,

      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const versio = 2;
    const projektiBefore: DBProjekti = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys: { ...(muokattavaHyvaksymisEsitys as unknown as MuokattavaHyvaksymisEsitys), hyvaksymisEsitys: null },
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
          organisaatio: "Organisaatio 1",
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
          organisaatio: "Organisaatio 1",
        },
      ],
      velho: {
        nimi: "Projektin nimi",
        asiatunnusELY: "asiatunnusELY",
        asiatunnusVayla: "asiatunnusVAYLA",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        kunnat: [91, 92],
      },
      asianhallinta: {
        inaktiivinen: false,
        asiaId: 14,
      },
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusProjarille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("email@email.com") && to.includes("email2@email.com");
    });
    expect(ilmoitusProjarille).to.exist;
    expect(
      /getParameterValue_AshaBaseUrl\/group\/asianhallinta\/asianhallinta\/-\/case\/14\/view/.test(
        (ilmoitusProjarille?.firstArg as EmailOptions).text as string
      )
    ).to.be.true; // "includes" ei toiminut tässä erikoismerkkien takia

    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Sähköpostin liitteenä on myös hyväksymisesitys"))
      .to.be.false;
  });

  it("onnistuu projektipäälliköltä", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    userFixture.loginAs(projari);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        projariAsVaylaDBUser,
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
        },
      ], // Muokkaajan tiedot tarvitsee olla, jotta s.postia lähetettäessä ei tule virhettä logille
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.fulfilled;
  });

  it("luo julkaistun hyväksymisesityksen muokattavan perusteella", async () => {
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet,
      velho,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(omit(projektiAfter.julkaistuHyvaksymisEsitys, "hyvaksymisPaiva")).to.eql({
      ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]),
      hyvaksyja: "theadminuid",
      vastaanottajat: [
        {
          lahetetty: "2000-01-01T02:00:00+02:00",
          lahetysvirhe: false,
          sahkoposti: "vastaanottaja@sahkoposti.fi",
        },
      ],
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("poistaa vanhat julkaistut tiedostot ja kopioi muokkaustilaisen hyväksymisesityksen tiedostot julkaisulle", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const julkaistuHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS2, hyvaksyja: "theadminuid", hyvaksymisPaiva: "2022-01-01" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      kayttoOikeudet,
      velho,
    };
    await insertProjektiToDB(projektiBefore);
    // Aseta julkaistulle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files).to.eql([
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
    ]);
  });

  it("kopioi muokkaustilaisen hyväksymisesityksen tiedostot julkaisulle, kun julkaistaan ekaa kertaa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet,
      velho,
    };
    await insertProjektiToDB(projektiBefore);

    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files).to.eql([
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/hyvaksymisEsitys/hyvaksymisEsitys_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/kuulutuksetJaKutsu/kuulutuksetJaKutsu_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/lausunnot/lausunnot_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/maanomistajaluettelo/maanomistajaluettelo_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muistutukset/muistutukset_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoKoneelta/muuAineistoKoneelta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/muuAineistoVelhosta/muuAineistoVelhosta_aoa_.png",
      "yllapito/tiedostot/projekti/Testi1/muokattava_hyvaksymisesitys/suunnitelma/suunnitelma_aoa_.png",
    ]);
  });

  it("ei onnistu projektihenkilöltä", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: muokkaaja.uid!,
    };
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA, palautusSyy: "Virheitä" };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty-tilassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.HYVAKSYTTY };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = { ...TEST_HYVAKSYMISESITYS, tila: API.HyvaksymisTila.MUOKKAUS };
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
    userFixture.loginAsAdmin();
    const versio = 2;
    const projektiBefore = {
      oid,
      versio,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu jos poistumisPaiva on menneisyydessa", async () => {
    MockDate.set("2023-01-02");
    userFixture.loginAsAdmin();
    const versio = 2;
    const projektiBefore: DBProjekti = {
      oid,
      versio,
      muokattavaHyvaksymisEsitys: {
        ...(TEST_HYVAKSYMISESITYS as unknown as MuokattavaHyvaksymisEsitys),
        tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
        palautusSyy: "Virheitä",
        poistumisPaiva: "2023-01-01",
      },
      kayttoOikeudet: kayttoOikeudet as unknown as DBVaylaUser[],
      velho,
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksy = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(hyvaksy).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Hyväksymisesityksen poistumispäivämäärä ei voi olla menneisyydessä"
    );
  });
});
