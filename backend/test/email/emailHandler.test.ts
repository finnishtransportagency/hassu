import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Readable } from "stream";
import { expectAwsCalls, S3Mock } from "../aws/awsMock";
import { createKuulutusHyvaksyttavanaEmail } from "../../src/email/emailTemplates";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { UserFixture } from "../fixture/userFixture";
import { fileService } from "../../src/files/fileService";
import { projektiSchedulerService } from "../../src/sqsEvents/projektiSchedulerService";
import { EmailClientStub, mockSaveProjektiToVelho } from "../../integrationtest/api/testUtil/util";
import { mockBankHolidays } from "../mocks";
import { GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { expect } from "chai";
import { TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { parameters } from "../../src/aws/parameters";
import { nahtavillaoloTilaManager } from "../../src/handler/tila/nahtavillaoloTilaManager";
import { KayttajaTyyppi, KuulutusJulkaisuTila, Vaihe } from "hassu-common/graphql/apiModel";
import { DBProjektiForSpecificVaiheFixture, VaiheenTila } from "../fixture/DBProjekti2ForSecificVaiheFixture";
import { DBProjekti } from "../../src/database/model";
import { assertIsDefined } from "../../src/util/assertions";
import { EmailOptions } from "../../src/email/model/emailOptions";
import { eventSqsClient } from "../../src/sqsEvents/eventSqsClient";

describe("emailHandler", () => {
  let getKayttajasStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let updateNahtavillaoloKuulutusJulkaisuStub: sinon.SinonStub;
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
    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    synchronizeProjektiFilesStub = sinon.stub(projektiSchedulerService, "synchronizeProjektiFiles");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
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
      const emailOptions = await createKuulutusHyvaksyttavanaEmail(fixture.dbProjekti5(), TilasiirtymaTyyppi.ALOITUSKUULUTUS);
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ELY/2/2022");

      expect(emailOptions.text).to.eq(
        "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi\n" +
          "Testiprojekti 2\n" +
          "on luotu aloituskuulutus, joka odottaa hyväksyntääsi.\n\n" +
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
  });

  describe("sendWaitingApprovalMailNahtavillaolokuulutus", () => {
    it("should send email to projektipaallikko succesfully", async () => {
      const emailOptions = await createKuulutusHyvaksyttavanaEmail(fixture.dbProjekti5(), TilasiirtymaTyyppi.NAHTAVILLAOLO);
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Nähtävilläolokuulutus odottaa hyväksyntää ELY/2/2022");

      expect(emailOptions.text).to.eq(
        "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi\n" +
          "Testiprojekti 2\n" +
          "on luotu nähtävilläolokuulutus, joka odottaa hyväksyntääsi.\n\n" +
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
      const emailOptions = await createKuulutusHyvaksyttavanaEmail(fixture.dbProjekti5(), TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE);
      expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus odottaa hyväksyntää ELY/2/2022");

      expect(emailOptions.text).to.eq(
        "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi\n" +
          "Testiprojekti 2\n" +
          "on luotu hyväksymispäätöskuulutus, joka odottaa hyväksyntääsi.\n\n" +
          "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/5/hyvaksymispaatos/kuulutus\n\n" +
          "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
      );
      expect(emailOptions.to).to.eql(["pekka.projari@vayla.fi"]);
    });
  });

  describe("nähtävilläolo", () => {
    let projekti: DBProjekti;
    before(() => {
      sinon.stub(eventSqsClient, "zipLausuntoPyyntoAineisto");
    });
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

      // Hyväksymisviesti projektipäällikölle ja ilmoitusviesti viranomaisille
      expect(emailClientStub.sendEmailStub.calledTwice).to.be.true;

      // Projektipäällikölle osoitettu viesti lähtee
      const vastaanottajaLista1 = (emailClientStub.sendEmailStub.firstCall.firstArg as EmailOptions).to;
      const projektiPaallikonEmail = projekti.kayttoOikeudet.find(
        (kayttoOikeus) => kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
      )?.email;
      expect(vastaanottajaLista1).to.include.all.members([projektiPaallikonEmail]);

      // Ilmoitusviesti lähtee viranomaisille
      const vastaanottajaLista2 = (emailClientStub.sendEmailStub.secondCall.firstArg as EmailOptions).to;
      expect(vastaanottajaLista2).to.include.all.members([
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

        // Ainoastaan Hyväksymisviesti projektipäällikölle
        expect(emailClientStub.sendEmailStub.calledOnce).to.be.true;
        const vastaanottajaLista1 = (emailClientStub.sendEmailStub.firstCall.firstArg as EmailOptions).to;
        const projektiPaallikonEmail = projekti.kayttoOikeudet.find(
          (kayttoOikeus) => kayttoOikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO
        )?.email;
        expect(vastaanottajaLista1).to.include.all.members([projektiPaallikonEmail]);
      });
    });
  });
});
