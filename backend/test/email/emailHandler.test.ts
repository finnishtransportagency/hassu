import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Readable } from "stream";
import { expectAwsCalls, S3Mock } from "../aws/awsMock";
import { createKuukausiEpaaktiiviseenEmail, createKuulutusHyvaksyttavanaEmail } from "../../src/email/emailTemplates";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { UserFixture } from "../fixture/userFixture";
import { fileService } from "../../src/files/fileService";
import { projektiSchedulerService } from "../../src/sqsEvents/projektiSchedulerService";
import { EmailClientStub, mockSaveProjektiToVelho } from "../../integrationtest/api/testUtil/util";
import { mockBankHolidays } from "../mocks";
import { GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { expect } from "chai";
import { KayttajaTyyppi, KuulutusJulkaisuTila, TilasiirtymaTyyppi, Vaihe } from "hassu-common/graphql/apiModel";
import { parameters } from "../../src/aws/parameters";
import { nahtavillaoloTilaManager } from "../../src/handler/tila/nahtavillaoloTilaManager";
import { DBProjektiForSpecificVaiheFixture, VaiheenTila } from "../fixture/DBProjekti2ForSecificVaiheFixture";
import { DBProjekti } from "../../src/database/model";
import { assertIsDefined } from "../../src/util/assertions";
import { EmailOptions } from "../../src/email/model/emailOptions";
import { eventSqsClient } from "../../src/sqsEvents/eventSqsClient";
import { hyvaksymisPaatosVaiheTilaManager } from "../../src/handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { fakeEventInSqsQueue } from "../sqsEvents/sqsEventHandlerLambdaTests/util/util";
import { SqsEventType } from "../../src/sqsEvents/sqsEvent";
import Mail from "nodemailer/lib/mailer";

describe("emailHandler", () => {
  let getKayttajasStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let updateNahtavillaoloKuulutusJulkaisuStub: sinon.SinonStub;
  let updateHyvaksymisPaatosVaiheJulkaisutStub: sinon.SinonStub;
  let publishProjektiFileStub: sinon.SinonStub;
  let synchronizeProjektiFilesStub: sinon.SinonStub;
  let fixture: ProjektiFixture;
  let personSearchFixture: PersonSearchFixture;

  mockBankHolidays();
  const emailClientStub = new EmailClientStub();
  const s3Mock = new S3Mock();

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    updateNahtavillaoloKuulutusJulkaisuStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "update");
    updateHyvaksymisPaatosVaiheJulkaisutStub = sinon.stub(projektiDatabase.hyvaksymisPaatosVaiheJulkaisut, "update");
    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    synchronizeProjektiFilesStub = sinon.stub(projektiSchedulerService, "synchronizeProjektiFiles");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(eventSqsClient, "zipLausuntoPyyntoAineisto");
    mockSaveProjektiToVelho();
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {
    fixture = new ProjektiFixture();
    personSearchFixture = new PersonSearchFixture();

    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
      ])
    );
    s3Mock.mockGetObject({
      Body: Readable.from(""),
      ContentType: "application/pdf",
    } as GetObjectCommandOutput);
  });

  describe("aloituskuulutus approval", () => {
    beforeEach(() => {
      loadProjektiByOidStub.resolves(fixture.dbProjekti5());
    });
    it("should send email to projektipaallikko succesfully", async () => {
      const emailOptions = createKuulutusHyvaksyttavanaEmail(fixture.dbProjekti5(), TilasiirtymaTyyppi.ALOITUSKUULUTUS);
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ELY/2/2022");

      expect(emailOptions.text).to.eq(
        "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi Testiprojekti 2 on luotu aloituskuulutus, joka odottaa hyväksyntääsi.\n\n" +
          "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/5/aloituskuulutus\n\n" +
          "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
      );
      expect(emailOptions.to).to.eql(["pekka.projari@vayla.fi"]);
    });

    it("should send emails and attachments succesfully", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateAloitusKuulutusJulkaisuStub.resolves();
      s3Mock.s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from(""),
        ContentType: "application/pdf",
      } as GetObjectCommandOutput);

      const projekti = fixture.dbProjekti5();

      await expect(aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari)).to.eventually.be.fulfilled;
      expectAwsCalls("s3Mock", s3Mock.s3Mock.calls());
      emailClientStub.verifyEmailsSent();
    });

    it("should send saame attachments succesfully", async () => {
      loadProjektiByOidStub.resolves(fixture.dbProjekti6());

      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateAloitusKuulutusJulkaisuStub.resolves();
      s3Mock.s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from(""),
        ContentType: "application/pdf",
      } as GetObjectCommandOutput);

      const projekti = fixture.dbProjekti6();

      await expect(aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari)).to.eventually.be.fulfilled;
      expectAwsCalls("s3Mock", s3Mock.s3Mock.calls());
      const calls = emailClientStub.sendEmailStub.getCalls();
      const hasPohjoissaameAttachment = calls[2].lastArg.attachments.some(
        (attachment: Mail.Attachment) =>
          attachment.filename === "POHJOISSAAME ILMOITUS SUUNNITTELUN ALOITTAMISESTA Marikan testiprojekti.pdf"
      );
      expect(hasPohjoissaameAttachment).to.be.true;
      emailClientStub.verifyEmailsSent();
    });
  });

  describe("sendWaitingApprovalMailNahtavillaolokuulutus", () => {
    it("should send email to projektipaallikko succesfully", async () => {
      const emailOptions = createKuulutusHyvaksyttavanaEmail(fixture.dbProjekti5(), TilasiirtymaTyyppi.NAHTAVILLAOLO);
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Nähtävilläolokuulutus odottaa hyväksyntää ELY/2/2022");

      expect(emailOptions.text).to.eq(
        "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi Testiprojekti 2 on luotu nähtävilläolokuulutus, joka odottaa hyväksyntääsi.\n\n" +
          "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/5/nahtavillaolo/kuulutus\n\n" +
          "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
      );
      expect(emailOptions.to).to.eql(["pekka.projari@vayla.fi"]);
    });
  });

  describe("sendWaitingApprovalMailHyvaksymispaatoskuulutus", () => {
    beforeEach(() => {
      loadProjektiByOidStub.resolves(fixture.dbProjekti5());
    });
    it("should send email to projektipaallikko succesfully", async () => {
      const emailOptions = createKuulutusHyvaksyttavanaEmail(fixture.dbProjekti5(), TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE);
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus odottaa hyväksyntää ELY/2/2022");

      expect(emailOptions.text).to.eq(
        "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi Testiprojekti 2 on luotu hyväksymispäätöskuulutus, joka odottaa hyväksyntääsi.\n\n" +
          "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/5/hyvaksymispaatos/kuulutus\n\n" +
          "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
      );
      expect(emailOptions.to).to.eql(["pekka.projari@vayla.fi"]);
    });
  });

  describe("nähtävilläolo", () => {
    let projekti: DBProjekti;
    beforeEach(() => {
      projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.ODOTTAA_HYVAKSYNTAA);
      loadProjektiByOidStub.resolves(projekti);
    });

    it("approval should send emails and attachments succesfully", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateNahtavillaoloKuulutusJulkaisuStub.resolves();
      s3Mock.s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from(""),
        ContentType: "application/pdf",
      } as GetObjectCommandOutput);

      await expect(nahtavillaoloTilaManager.approve(projekti, UserFixture.hassuATunnus1)).to.eventually.be.fulfilled;
      expectAwsCalls("s3Mock", s3Mock.s3Mock.calls());

      // Hyväksymisviesti laatijalle, projektipäällikölle ja ilmoitusviesti viranomaisille
      expect(emailClientStub.sendEmailStub.calledThrice).to.be.true;

      // Laatijalle osoitettu viesti lähtee
      const vastaanottajaLista1 = (emailClientStub.sendEmailStub.firstCall.firstArg as EmailOptions).to;
      expect(vastaanottajaLista1).to.equal("matti.meikalainen@vayla.fi");

      // Projektipäällikölle osoitettu viesti lähtee
      const vastaanottajaLista2 = (emailClientStub.sendEmailStub.secondCall.firstArg as EmailOptions).to;
      const projektiPaallikonEmail = projekti.kayttoOikeudet.find(
        (kayttoOikeus) => kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
      )?.email;
      expect(vastaanottajaLista2).to.include.all.members([projektiPaallikonEmail]);

      // Ilmoitusviesti lähtee viranomaisille
      const vastaanottajaLista3 = (emailClientStub.sendEmailStub.thirdCall.firstArg as EmailOptions).to;
      expect(vastaanottajaLista3).to.include.all.members([
        "mikkeli@mikke.li",
        "juva@ju.va",
        "savonlinna@savonlin.na",
        "kirjaamo.etela-savo@ely-keskus.fi",
      ]);
    });

    describe("aineistomuokkaus", () => {
      beforeEach(() => {
        projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.HYVAKSYTTY);
        assertIsDefined(projekti.nahtavillaoloVaiheJulkaisut?.[0]?.hyvaksymisPaiva);

        const julkaisu1 = projekti.nahtavillaoloVaiheJulkaisut[0];
        projekti.nahtavillaoloVaiheJulkaisut = [
          julkaisu1,
          {
            ...julkaisu1,
            aineistoMuokkaus: { alkuperainenHyvaksymisPaiva: julkaisu1.hyvaksymisPaiva! },
            tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
          },
        ];

        loadProjektiByOidStub.resolves(projekti);
      });

      it("approval wont send ilmoitus mails for aineistoMuokkaus", async () => {
        publishProjektiFileStub.resolves();
        synchronizeProjektiFilesStub.resolves();
        updateNahtavillaoloKuulutusJulkaisuStub.resolves();
        s3Mock.s3Mock.on(GetObjectCommand).resolves({
          Body: Readable.from(""),
          ContentType: "application/pdf",
        } as GetObjectCommandOutput);
        await expect(nahtavillaoloTilaManager.approve(projekti, UserFixture.pekkaProjari)).to.eventually.be.fulfilled;
        expectAwsCalls("s3Mock", s3Mock.s3Mock.calls());

        // Viestit laatijalle ja projektipäällikölle
        expect(emailClientStub.sendEmailStub.calledTwice).to.be.true;
        // Laatijalle osoitettu viesti lähtee
        const vastaanottajaLista1 = (emailClientStub.sendEmailStub.firstCall.firstArg as EmailOptions).to;
        expect(vastaanottajaLista1).to.equal("matti.meikalainen@vayla.fi");

        // hyväksymisviesti projektipäällikölle
        const vastaanottajaLista2 = (emailClientStub.sendEmailStub.secondCall.firstArg as EmailOptions).to;
        const projektiPaallikonEmail = projekti.kayttoOikeudet.find(
          (kayttoOikeus) => kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
        )?.email;
        expect(vastaanottajaLista2).to.include.all.members([projektiPaallikonEmail]);
      });
    });
  });

  describe("hyväksymispäätös", () => {
    let projekti: DBProjekti;
    beforeEach(() => {
      projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.HYVAKSYMISPAATOS, VaiheenTila.ODOTTAA_HYVAKSYNTAA);
      loadProjektiByOidStub.resolves(projekti);
    });

    it("approval should send emails and attachments succesfully", async () => {
      publishProjektiFileStub.resolves();
      synchronizeProjektiFilesStub.resolves();
      updateHyvaksymisPaatosVaiheJulkaisutStub.resolves();
      s3Mock.s3Mock.on(GetObjectCommand).resolves({
        Body: Readable.from(""),
        ContentType: "application/pdf",
      } as GetObjectCommandOutput);

      console.log(projekti.hyvaksymisPaatosVaiheJulkaisut);

      await expect(hyvaksymisPaatosVaiheTilaManager.approve(projekti, UserFixture.hassuATunnus1)).to.eventually.be.fulfilled;
      expectAwsCalls("s3Mock", s3Mock.s3Mock.calls());

      // Hyväksymisviesti laatijalle, projektipäällikölle ja ilmoitusviesti viranomaisille
      expect(emailClientStub.sendEmailStub.calledThrice).to.be.true;

      // Laatijalle osoitettu viesti lähtee
      const vastaanottajaLista1 = (emailClientStub.sendEmailStub.firstCall.firstArg as EmailOptions).to;
      expect(vastaanottajaLista1).to.equal("matti.meikalainen@vayla.fi");

      // Projektipäällikölle osoitettu viesti lähtee
      const vastaanottajaLista2 = (emailClientStub.sendEmailStub.secondCall.firstArg as EmailOptions).to;
      const projektiPaallikonEmail = projekti.kayttoOikeudet.find(
        (kayttoOikeus) => kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
      )?.email;
      expect(vastaanottajaLista2).to.include.all.members([projektiPaallikonEmail]);

      // Ilmoitusviesti lähtee viranomaisille
      const vastaanottajaLista3 = (emailClientStub.sendEmailStub.thirdCall.firstArg as EmailOptions).to;
      expect(vastaanottajaLista3).to.include.all.members([
        "mikkeli@mikke.li",
        "juva@ju.va",
        "savonlinna@savonlin.na",
        "kirjaamo.etela-savo@ely-keskus.fi",
      ]);
    });

    describe("aineistomuokkaus", () => {
      beforeEach(() => {
        projekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.HYVAKSYMISPAATOS, VaiheenTila.HYVAKSYTTY);
        assertIsDefined(projekti.hyvaksymisPaatosVaiheJulkaisut?.[0]?.hyvaksymisPaiva);

        const julkaisu1 = projekti.hyvaksymisPaatosVaiheJulkaisut[0];
        projekti.hyvaksymisPaatosVaiheJulkaisut = [
          julkaisu1,
          {
            ...julkaisu1,
            aineistoMuokkaus: { alkuperainenHyvaksymisPaiva: julkaisu1.hyvaksymisPaiva! },
            tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
          },
        ];

        loadProjektiByOidStub.resolves(projekti);
      });

      it("approval wont send ilmoitus mails for aineistoMuokkaus", async () => {
        publishProjektiFileStub.resolves();
        synchronizeProjektiFilesStub.resolves();
        updateHyvaksymisPaatosVaiheJulkaisutStub.resolves();
        s3Mock.s3Mock.on(GetObjectCommand).resolves({
          Body: Readable.from(""),
          ContentType: "application/pdf",
        } as GetObjectCommandOutput);
        await expect(hyvaksymisPaatosVaiheTilaManager.approve(projekti, UserFixture.pekkaProjari)).to.eventually.be.fulfilled;
        expectAwsCalls("s3Mock", s3Mock.s3Mock.calls());

        // Viestit laatijalle ja projektipäällikölle
        expect(emailClientStub.sendEmailStub.calledTwice).to.be.true;
        // Laatijalle osoitettu viesti lähtee
        const vastaanottajaLista1 = (emailClientStub.sendEmailStub.firstCall.firstArg as EmailOptions).to;
        expect(vastaanottajaLista1).to.equal("matti.meikalainen@vayla.fi");

        // hyväksymisviesti projektipäällikölle
        const vastaanottajaLista2 = (emailClientStub.sendEmailStub.secondCall.firstArg as EmailOptions).to;
        const projektiPaallikonEmail = projekti.kayttoOikeudet.find(
          (kayttoOikeus) => kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
        )?.email;
        expect(vastaanottajaLista2).to.include.all.members([projektiPaallikonEmail]);
      });
    });
  });

  describe("sendOneMonthToExpireMail", () => {
    it("should create email to projektipaallikko succesfully", async () => {
      const emailOptions = createKuukausiEpaaktiiviseenEmail(fixture.dbProjekti5());
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Suunnitelma Testiprojekti 2 siirtyy epäaktiiviseen tilaan");

      expect(emailOptions.text).to.eq(
        "Suunnitelma Testiprojekti 2 siirtyy epäaktiiviseen tilaan Valtion liikenneväylien suunnittelu -järjestelmässä kuukauden kuluttua. Tämä tarkoittaa sitä, että suunnitelma poistuu palvelun kansalaisnäkymästä ja samalla virkamiesnäkymässä suunnitelman tiedot lukittuvat eli tietoja ei pysty muokkaamaan ja suunnitelmaan liittyvät asiakirjat poistetaan palvelusta.\n\n" +
          "Tarkista ennen suunnitelman siirtymistä epäaktiiviseksi, että asianhallintaan tallennettavat asiakirjat (kuulutukset ja ilmoitukset) löytyvät suunnitelman asialta. Ota tarvittaessa talteen myös suunnitelmasta saadut palautteet.\n\n" +
          "Suunnitelma siirtyy epäaktiiviseen tilaan kun hyväksymispäätöksen kuulutuksen päättymisestä on kulunut yksi vuosi. Käsittelyn tila -sivu pysyy pääkäyttäjän muokattavissa. Pääkäyttäjä aktivoi suunnitelman uudelleen, jos suunnitelman voimassaoloa myöhemmin jatketaan.\n\n" +
          "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
      );
      expect(emailOptions.to).to.eql(["pekka.projari@vayla.fi"]);
    });

    it("should send email to projektipaallikko succesfully on sqs event", async () => {
      const handler = fakeEventInSqsQueue({ eventType: SqsEventType.ONE_MONTH_TO_INACTIVE, projektiOid: "1" });
      const projekti: DBProjekti = {
        oid: "1",
        versio: 1,
        kayttoOikeudet: [],
        salt: "salt",
        tallennettu: true,
        velho: { nimi: "Projekti 1" },
      };

      loadProjektiByOidStub.resolves(projekti);

      await handler();
      // Viesti projektipäällikölle
      expect(emailClientStub.sendEmailStub.called).to.be.true;
    });
  });
});
