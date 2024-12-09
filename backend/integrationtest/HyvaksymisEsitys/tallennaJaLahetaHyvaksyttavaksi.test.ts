import sinon from "sinon";
import { userService } from "../../src/user";
import TEST_HYVAKSYMISESITYS, { TEST_HYVAKSYMISESITYS2, TEST_HYVAKSYMISESITYS_FILES } from "./TEST_HYVAKSYMISESITYS";
import { deleteYllapitoFiles, insertUploadFileToS3, insertYllapitoFileToS3 } from "./util";
import { UserFixture } from "../../test/fixture/userFixture";
import { getProjektiFromDB, insertProjektiToDB, removeProjektiFromDB, setupLocalDatabase } from "../util/databaseUtil";
import { tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi } from "../../src/HyvaksymisEsitys/actions";
import { TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO } from "./TEST_HYVAKSYMISESITYS_INPUT";
import * as API from "hassu-common/graphql/apiModel";

import { expect } from "chai";
import { DBProjekti, DBVaylaUser } from "../../src/database/model";
import { IllegalAccessError, IllegalArgumentError } from "hassu-common/error";
import { adaptFileName, joinPath } from "../../src/tiedostot/paths";
import MockDate from "mockdate";
import { emailClient } from "../../src/email/email";
import { EmailOptions } from "../../src/email/model/emailOptions";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { ValidationError } from "yup";
import { cloneDeep } from "lodash";
import { DeepReadonly } from "hassu-common/specialTypes";
import { parameters } from "../../src/aws/parameters";
import { SqsClient } from "../../src/HyvaksymisEsitys/aineistoHandling/sqsClient";

const oid = "Testi1";

const projari = UserFixture.pekkaProjari;
const projariAsVaylaDBUser: DBVaylaUser = {
  kayttajatunnus: projari.uid!,
  tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
  etunimi: "Pekka",
  sukunimi: "Projari",
  email: "pekka.projari@vayla.fi",
  organisaatio: "Väylävirasto",
  puhelinnumero: "123456789",
};
const muokkaaja = UserFixture.manuMuokkaaja;
const muokkaajaAsVaylaDBUser: DBVaylaUser = {
  kayttajatunnus: muokkaaja.uid!,
  email: "namu.muokkaaja@vayla.fi",
  etunimi: "Manu",
  sukunimi: "Muokkaaja",
  organisaatio: "Väylävirasto",
  puhelinnumero: "123456789",
};

const getProjektiBase: () => DeepReadonly<DBProjekti> = () => ({
  oid,
  versio: 2,
  kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
  vuorovaikutusKierros: { tila: API.VuorovaikutusKierrosTila.MIGROITU, vuorovaikutusNumero: 1 },
  asianhallinta: { inaktiivinen: true },
  euRahoitus: false,
  kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI },
  velho: {
    nimi: "Projektin nimi",
    asiatunnusVayla: "asiatunnusVayla",
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    kunnat: [91, 92],
  },
});

describe("Hyväksymisesityksen tallentaminen ja hyväksyttäväksi lähettäminen", () => {
  const userFixture = new UserFixture(userService);
  setupLocalDatabase();
  let emailStub: sinon.SinonStub<[options: EmailOptions], Promise<SMTPTransport.SentMessageInfo | undefined>> | undefined;

  before(async () => {
    // Poista projektin tiedostot testisetin alussa
    await deleteYllapitoFiles(`yllapito/tiedostot/projekti/${oid}/`);
    emailStub = sinon.stub(emailClient, "sendEmail");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(SqsClient, "addEventToSqsQueue");
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
    MockDate.reset();
    emailStub?.reset();
  });

  after(() => {
    sinon.reset();
    sinon.restore();
  });

  it("päivittää muokattavan hyväksymisesityksen tilan ja poistaa palautusSyyn", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.tila).to.eql(API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.palautusSyy).is.undefined;
  });

  it("ei onnistu, jos projektin status on liian pieni", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    // Otetaan projektilta euRahoitus ja kielitiedot pois, jotta projektin status on EI_JULKAISTU
    const { euRahoitus: _eu, kielitiedot: _kt, ...projekti } = getProjektiBase();
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...projekti,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError, "Projektin hyväksymisesitysvaihe ei ole aktiivinen");
  });

  it("lähettää s.postin projarille", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      kayttoOikeudet: [
        {
          etunimi: "Etunimi",
          sukunimi: "Sukunimi",
          email: "email@email.com",
          kayttajatunnus: "theadminuid",
          tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291221",
        },
        {
          etunimi: "Etunimi2",
          sukunimi: "Sukunimi2",
          email: "email2@email.com",
          kayttajatunnus: "theotheruid",
          tyyppi: API.KayttajaTyyppi.VARAHENKILO,
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291221",
        },
      ],
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    expect(emailStub?.firstCall).to.exist;
    const firstArgs = emailStub?.firstCall.firstArg as EmailOptions;
    expect(firstArgs.to).to.eql(["email@email.com", "email2@email.com"]);
    expect(firstArgs).toMatchSnapshot();
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos poistumisPaiva menneisyydessa", async () => {
    MockDate.set("2023-01-02");
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...hyvaksymisEsitysInput, poistumisPaiva: "2023-01-01" },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(ValidationError, "Päivämäärää ei voi asettaa menneisyyteen");
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos OVT-tunnus puuttuu", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO);
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);

    delete hyvaksymisEsitysInput.laskutustiedot?.ovtTunnus;

    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...hyvaksymisEsitysInput },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(ValidationError, "OVT-tunnus on annettava");
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos laskutustiedot.verkkolaskuoperaattorinTunnus puuttuu", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = cloneDeep(TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO);
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);

    delete hyvaksymisEsitysInput.laskutustiedot?.verkkolaskuoperaattorinTunnus;

    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: { ...hyvaksymisEsitysInput },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(ValidationError, "Verkkolaskuoperaattorin välittäjätunnus on annettava");
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos OVT-tunnus on tyhjänä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);

    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: {
        ...hyvaksymisEsitysInput,
        laskutustiedot: { ...(hyvaksymisEsitysInput.laskutustiedot ?? {}), verkkolaskuoperaattorinTunnus: "" },
      },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(ValidationError, "Verkkolaskuoperaattorin välittäjätunnus on pakollinen");
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos vastaanottajan sähköposti on virheellinen", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);

    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: {
        ...hyvaksymisEsitysInput,
        vastaanottajat: [{ sahkoposti: "testi.testi.com" }],
      },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(ValidationError, "Virheellinen sähköpostiosoite");
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos vastaanottajalista on tyhjä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);

    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: {
        ...hyvaksymisEsitysInput,
        vastaanottajat: [],
      },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(
      ValidationError,
      "muokattavaHyvaksymisEsitys.vastaanottajat field must have at least 1 items"
    );
  });

  it("hyväksyttäväksi lähettäminen ei onnistu jos vastaanottajan sähköpostiosoite on tyhjä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);

    const tallennaProjekti = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: {
        ...hyvaksymisEsitysInput,
        vastaanottajat: [{ sahkoposti: "" }],
      },
    });
    await expect(tallennaProjekti).to.eventually.be.rejectedWith(ValidationError, "Sähköposti on pakollinen");
  });

  it("ei onnistu, jos tallennuksen yhteydessä annetaan uusi aineisto", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      suunnitelma: [
        {
          dokumenttiOid: "suunnitelmaDokumenttiOid2",
          nimi: "suunnitelma äöå 2.png",
          uuid: "suunnitelma-uuid2",
          kategoriaId: "osa_b",
        },
      ],
    };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("onnistuu, vaikka tallennuksen yhteydessä annetaan uusi ladattu tiedosto", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const muistutusFileName = "muistutukset äöå 2.png";
    const uploadsUuid = "joku-uuid";
    const hyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      muistutukset: [
        {
          kunta: 1,
          tiedosto: joinPath(uploadsUuid, adaptFileName(muistutusFileName)),
          nimi: muistutusFileName,
          uuid: "muistutukset-esitys-uuid2",
        },
      ],
    };
    await insertUploadFileToS3(uploadsUuid, muistutusFileName);
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("muuttaa muokattavaa hyväksymisesitystä ennen hyväksyttäväksi lähettämistä", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const muistutusFileName = "muistutukset äöå 2.png";
    const uploadsUuid = "joku-uuid";
    const muistutusUuid = "muistutukset-esitys-uuid2";
    const hyvaksymisEsitysInput = {
      ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO,
      muistutukset: [
        {
          kunta: 2,
          tiedosto: joinPath(uploadsUuid, adaptFileName(muistutusFileName)),
          nimi: muistutusFileName,
          uuid: muistutusUuid,
        },
      ],
      poistumisPaiva: "2033-01-02",
      kiireellinen: false,
      lisatiedot: "Lisätietoja2",
      laskutustiedot: {
        ovtTunnus: "ovtTunnus2",
        verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus2",
        viitetieto: "viitetieto2",
      },
    };
    await insertUploadFileToS3(uploadsUuid, muistutusFileName);
    const date = "2022-02-01";
    MockDate.set(date);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.muistutukset).to.eql([
      { kunta: 2, nimi: muistutusFileName, uuid: muistutusUuid, lisatty: "2022-02-01T02:00:00+02:00" },
    ]);
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.poistumisPaiva).to.eql("2033-01-02");
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.lisatiedot).to.eql("Lisätietoja2");
    expect(projektiAfter.muokattavaHyvaksymisEsitys?.laskutustiedot).to.eql({
      ovtTunnus: "ovtTunnus2",
      verkkolaskuoperaattorinTunnus: "verkkolaskuoperaattorinTunnus2",
      viitetieto: "viitetieto2",
    });
  });

  it("onnistuu projektihenkilöltä", async () => {
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("ei onnistu henkilöltä, joka ei ole projektissa", async () => {
    userFixture.loginAs(muokkaaja);
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const { kayttoOikeudet: _ko, ...projekti } = getProjektiBase();
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...projekti,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      kayttoOikeudet: [projariAsVaylaDBUser],
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  it("ei onnistu, jos muokattava hyväksymisesitys on hyväksytty", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.HYVAKSYTTY,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      hyvaksyja: "theadminoid",
      hyvaksymisPaiva: "2022-01-02",
      poistumisPaiva: "2033-01-01",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("onnistuu, vaikka yksi hyväksymisesitys olisi jo hyväksytty", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const julkaistuHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS2,
      hyvaksyja: "theadminoid",
      hyvaksymisPaiva: "2022-01-02",
      poistumisPaiva: "2033-01-01",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.fulfilled;
  });

  it("ei onnistu, jos muokattava hyväksymisesitys odottaa hyväksyntää", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      tila: API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos kaikki aineistot eivät ole valmiita", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      suunnitelma: [
        {
          dokumenttiOid: `suunnitelmaDokumenttiOid`,
          nimi: `suunnitelma äöå .png`,
          uuid: `suunnitelma-uuid`,
          lisatty: "2022-01-02T03:00:01+02:00", // myöhemmin kuin aineistoHandledAt
        },
      ],
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei onnistu, jos tietoja puuttuu", async () => {
    userFixture.loginAsAdmin();
    const { suunnitelma: _s, ...muut } = TEST_HYVAKSYMISESITYS;
    const muokattavaHyvaksymisEsitys = {
      ...muut,
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
    };
    await insertProjektiToDB(projektiBefore);
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const kutsu = tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({
      oid,
      versio: 2,
      muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput,
    });
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei ylikirjoita aineistoHandledAt-tietoa", async () => {
    userFixture.loginAsAdmin();
    const muokattavaHyvaksymisEsitys = {
      ...TEST_HYVAKSYMISESITYS,
      palautusSyy: "virheitä",
      tila: API.HyvaksymisTila.MUOKKAUS,
    };
    const hyvaksymisEsitysInput = { ...TEST_HYVAKSYMISESITYS_INPUT_NO_TIEDOSTO };
    const projektiBefore: DeepReadonly<DBProjekti> = {
      ...getProjektiBase(),
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys: undefined,
      aineistoHandledAt: "2022-01-02T03:00:00+02:00",
    };
    await insertProjektiToDB(projektiBefore);
    await tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi({ oid, versio: 2, muokattavaHyvaksymisEsitys: hyvaksymisEsitysInput });
    const projektiAfter = await getProjektiFromDB(oid);
    expect(projektiAfter.aineistoHandledAt).to.eql("2022-01-02T03:00:00+02:00");
  });
});
