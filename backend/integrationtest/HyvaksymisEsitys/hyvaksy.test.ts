import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, DBVaylaUser } from "../../src/database/model";
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
import { DeepReadonly } from "hassu-common/specialTypes";

const oid = "Testi1";

const getProjektiBase: () => DeepReadonly<DBProjekti> = () => ({
  oid,
  versio: 2,
  vuorovaikutusKierros: { tila: API.VuorovaikutusKierrosTila.MIGROITU, vuorovaikutusNumero: 1 },
  asianhallinta: { inaktiivinen: true },
  euRahoitus: false,
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  kayttoOikeudet: [
    {
      etunimi: "Etunimi",
      sukunimi: "Sukunimi",
      email: "email@email.com",
      kayttajatunnus: "theadminuid",
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      elyOrganisaatio: API.ELY.HAME_ELY,
      puhelinnumero: "0291234567",
      organisaatio: "org1",
    },
    {
      etunimi: "Etunimi2",
      sukunimi: "Sukunimi2",
      email: "email2@email.com",
      kayttajatunnus: "thevarahenkilouid",
      tyyppi: API.KayttajaTyyppi.VARAHENKILO,
      puhelinnumero: "0291213",
      organisaatio: "org2",
    },
    {
      etunimi: "Matti",
      sukunimi: "Muokkaaja",
      email: "muokkaaja@email.com",
      kayttajatunnus: "muokkaaja-oid",
      puhelinnumero: "0291213",
      organisaatio: "org2",
    },
  ],
  velho: {
    nimi: "Projektin nimi",
    asiatunnusELY: "asiatunnusELY",
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.LAPIN_ELY,
    kunnat: [91, 92],
  },
  salt: "suola",
});

describe("Hyväksymisesityksen hyväksyminen", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  let emailStub: sinon.SinonStub<[options: EmailOptions], Promise<SMTPTransport.SentMessageInfo | undefined>> | undefined;

  // Sähköpostin lähettämistä varten projektilla on oltava kayttoOikeudet ja velho

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);

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

    // Stubataan sähköpostin lähettäminen
    emailStub = sinon.stub(emailClient, "sendEmail").resolves({
      messageId: "messageId123",
      accepted: ["vastaanottaja@sahkoposti.fi"],
      rejected: [],
      pending: [],
      envelope: {
        from: false,
        to: [],
      },
      response: "response",
    });
  });

  afterEach(async () => {
    // Poista projektin tiedostot joka testin päätteeksi
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}`);
    // Poista projekti joka testin päätteeksi
    await removeProjektiFromDB(oid);
    userFixture.logout();
    emailStub?.reset();
    emailStub?.restore();
    MockDate.reset();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("päivittää muokattavan hyväksymisesityksen tilan ja palautusSyyn ja s.postin lähetystiedot", async () => {
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio: projektiBefore.versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect({
      ...omit(projektiAfter, "paivitetty"),
      julkaistuHyvaksymisEsitys: omit(projektiAfter.julkaistuHyvaksymisEsitys, "hyvaksymisPaiva"),
    }).to.eql({
      ...projektiBefore,
      versio: projektiBefore.versio + 1,
      muokattavaHyvaksymisEsitys: { ...muokattavaHyvaksymisEsitys, tila: API.HyvaksymisTila.HYVAKSYTTY, palautusSyy: null },
      julkaistuHyvaksymisEsitys: {
        ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]),
        hyvaksyja: "theadminuid",
        vastaanottajat: [
          {
            lahetetty: "2000-01-01T02:00:00+02:00",
            messageId: "messageId123",
            sahkoposti: "vastaanottaja@sahkoposti.fi",
          },
        ],
      },
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("ei onnistu, jos projektin status on liian pieni", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const { euRahoitus: _eu, kielitiedot: _kt, ...projekti } = getProjektiBase();
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...projekti,
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio: projektiBefore.versio });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError, "Projektin hyväksymisesitysvaihe ei ole aktiivinen");
  });

  it("merkitsee sähköpostin lähetystietoihin lähetysvirheen, jos sellainen tapahtuu", async () => {
    MockDate.set("2000-01-01");
    emailStub?.onFirstCall().resolves({
      messageId: "messageId123",
      accepted: [],
      rejected: ["vastaanottaja@sahkoposti.fi"],
      pending: [],
      envelope: {
        from: false,
        to: [],
      },
      response: "response",
    });
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio: projektiBefore.versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.julkaistuHyvaksymisEsitys.vastaanottajat).to.eql([
      {
        sahkoposti: "vastaanottaja@sahkoposti.fi",
        lahetysvirhe: true,
      },
    ]);
  });

  it("merkitsee sähköpostin lähetystietoihin lähetysvirheen, jos sähköpostin lähettäminen epäonnistuu", async () => {
    MockDate.set("2000-01-01");
    emailStub?.onFirstCall().resolves(undefined);
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio: projektiBefore.versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.julkaistuHyvaksymisEsitys.vastaanottajat).to.eql([
      {
        sahkoposti: "vastaanottaja@sahkoposti.fi",
        lahetysvirhe: true,
      },
    ]);
  });

  it("hallitsee tilanteen, jossa yksi s.posti onnistuu ja toinen ei", async () => {
    MockDate.set("2000-01-01");
    emailStub?.onFirstCall().resolves({
      messageId: "messageId123",
      accepted: ["vastaanottaja1@sahkoposti.fi"],
      rejected: ["vastaanottaja2@sahkoposti.fi"],
      pending: [],
      envelope: {
        from: false,
        to: [],
      },
      response: "response",
    });
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      vastaanottajat: [
        {
          sahkoposti: `vastaanottaja1@sahkoposti.fi`,
        },
        {
          sahkoposti: `vastaanottaja2@sahkoposti.fi`,
        },
      ],
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio: projektiBefore.versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.julkaistuHyvaksymisEsitys.vastaanottajat).to.eql([
      {
        sahkoposti: "vastaanottaja1@sahkoposti.fi",
        lahetetty: "2000-01-01T02:00:00+02:00",
        messageId: "messageId123",
      },
      {
        sahkoposti: "vastaanottaja2@sahkoposti.fi",
        lahetysvirhe: true,
      },
    ]);
  });

  it("lähettää oikeat s.postit kun tarvitaan kiireellistä käsittelyä ja asianhallinta ei ole aktiivinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const versio = 2;
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      asianhallinta: {
        inaktiivinen: true,
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
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const versio = 2;
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
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
          kayttajatunnus: "thevarahenkilouid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
          puhelinnumero: "0291234567",
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
          puhelinnumero: "0291234567",
        },
      ],
      asianhallinta: {
        inaktiivinen: true,
      },
      vuorovaikutusKierros: { tila: API.VuorovaikutusKierrosTila.MIGROITU, vuorovaikutusNumero: 1 },
      euRahoitus: false,
      kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI, toissijainenKieli: undefined },
      velho: {
        nimi: "Projektin nimi",
        asiatunnusELY: "asiatunnusELY",
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.LAPIN_ELY,
        kunnat: [91, 92],
      },
      salt: "suola",
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

  it("näyttää oikeat tiedot s.postissa, kun vastaava viranomainen on Väylävirasto ja projarin organisaatio on Väylävirasto ja asianhallinta on aktiivinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const { kayttoOikeudet: _ko, ...projektinen } = getProjektiBase();
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...projektinen,
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
          kayttajatunnus: "thevarahenkilouid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
          puhelinnumero: "0291234567",
          organisaatio: "Väylävirasto",
        },
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
          puhelinnumero: "0291234567",
          organisaatio: "Väylävirasto",
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
    const versio = projektiBefore.versio;
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
      hyvaksymisEsitys: null,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    expect(emailStub?.callCount).to.eql(3);

    const ilmoitusProjarille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("email@email.com") && to.includes("email2@email.com");
    });
    expect(ilmoitusProjarille).to.exist;
    const ilmoitusVastaanottajille = emailStub?.getCalls().find((call) => {
      const to = (call.firstArg as EmailOptions).to;
      return Array.isArray(to) && to.includes("vastaanottaja@sahkoposti.fi");
    });
    expect(((ilmoitusVastaanottajille?.firstArg as EmailOptions).text as string).includes("Sähköpostin liitteenä on myös hyväksymisesitys"))
      .to.be.false;
  });

  it("onnistuu projektipäälliköltä", async () => {
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: DBVaylaUser = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      puhelinnumero: "029213213",
      email: "projari.projarinen@vayla.fi",
      etunimi: "Projari",
      sukunimi: "Projarinen",
      organisaatio: "Väylävirasto",
    };
    userFixture.loginAs(projari);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [
        projariAsVaylaDBUser,
        {
          etunimi: "Matti",
          sukunimi: "Muokkaaja",
          email: "muokkaaja@email.com",
          kayttajatunnus: "muokkaaja-oid",
          puhelinnumero: "029213213",
          organisaatio: "Organisaatio 123",
        },
      ],
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.fulfilled;
  });

  it("luo julkaistun hyväksymisesityksen muokattavan perusteella", async () => {
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(omit(projektiAfter.julkaistuHyvaksymisEsitys, "hyvaksymisPaiva")).to.eql({
      ...omit(muokattavaHyvaksymisEsitys, ["tila", "palautusSyy"]),
      hyvaksyja: "theadminuid",
      vastaanottajat: [
        {
          lahetetty: "2000-01-01T02:00:00+02:00",
          messageId: "messageId123",
          sahkoposti: "vastaanottaja@sahkoposti.fi",
        },
      ],
    });
    expect(projektiAfter.paivitetty).to.exist;
    expect(projektiAfter.julkaistuHyvaksymisEsitys.hyvaksymisPaiva).to.exist;
  });

  it("tallentaa lähetetyn s.postin s3:een", async () => {
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      hyvaksyja: "theadminuid",
      hyvaksymisPaiva: "2022-01-01",
      poistumisPaiva: "2033-01-01",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    // Aseta julkaistulle hyväksymisesitykselle tiedostoja S3:een
    await Promise.all(
      TEST_HYVAKSYMISESITYS_FILES2.map(async ({ path }) => {
        const fullpath = `yllapito/tiedostot/projekti/${oid}/hyvaksymisesitys/${path}`;
        await insertYllapitoFileToS3(fullpath);
      })
    );

    const emailFilesBefore = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}/hyvaksymisesityksen_spostit/`);
    expect(emailFilesBefore).to.eql([]);
    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const emailFilesAfter = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}/hyvaksymisesityksen_spostit/`);
    expect(emailFilesAfter).to.eql(["yllapito/tiedostot/projekti/Testi1/hyvaksymisesityksen_spostit/20000101-020000_hyvaksymisesitys.eml"]);
  });

  it("poistaa vanhat julkaistut tiedostot ja kopioi muokkaustilaisen hyväksymisesityksen tiedostot julkaisulle", async () => {
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      hyvaksyja: "theadminuid",
      hyvaksymisPaiva: "2022-01-01",
      poistumisPaiva: "2033-01-01",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
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
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesityksen_spostit/20000101-020000_hyvaksymisesitys.eml",
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
    MockDate.set("2000-01-01");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);

    await hyvaksyHyvaksymisEsitys({ oid, versio });
    const files = await getYllapitoFilesUnderPath(`yllapito/tiedostot/projekti/${oid}`);
    expect(files).to.eql([
      "yllapito/tiedostot/projekti/Testi1/hyvaksymisesityksen_spostit/20000101-020000_hyvaksymisesitys.eml",
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
    const projariAsVaylaDBUser: DBVaylaUser = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      email: "projari@vayla.fi",
      etunimi: "projari",
      sukunimi: "projarinen",
      organisaatio: "Väylävirasto",
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    const muokkaajaAsVaylaDBUser: DBVaylaUser = {
      kayttajatunnus: muokkaaja.uid!,
      email: "manumuokkaaja@vayla.fi",
      etunimi: "manu",
      sukunimi: "muokkaaja",
      organisaatio: "Väylävirasto",
    };
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty-tilassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä"
    );
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on muokkaustilassa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä"
    );
  });

  it("ei onnistu, jos muokattavaa hyväksymisesitystä ei ole", async () => {
    userFixture.loginAsAdmin();
    const projektiBefore = getProjektiBase();
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    const kutsu = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(kutsu).to.be.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Projektilla ei ole hyväksymistä odottavaa hyväksymisesitystä"
    );
  });

  it("ei onnistu jos poistumisPaiva on menneisyydessa", async () => {
    MockDate.set("2023-01-02");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      palautusSyy: "Virheitä",
      poistumisPaiva: "2023-01-01",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
    };
    const versio = projektiBefore.versio;
    await insertProjektiToDB(projektiBefore);
    const hyvaksy = hyvaksyHyvaksymisEsitys({ oid, versio });
    await expect(hyvaksy).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      "Hyväksymisesityksen poistumispäivämäärä ei voi olla menneisyydessä"
    );
  });
});
