import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Readable } from "stream";
import { awsMockResolves, expectAwsCalls } from "../aws/awsMock";
import { getS3 } from "../../src/aws/client";
import { createAloituskuulutusHyvaksyttavanaEmail } from "../../src/email/emailTemplates";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { UserFixture } from "../fixture/userFixture";
import { fileService } from "../../src/files/fileService";
import { aineistoSynchronizerService } from "../../src/aineisto/aineistoSynchronizerService";
import { defaultMocks } from "../../integrationtest/api/testUtil/util";
import { mockBankHolidays } from "../mocks";

const { expect } = require("chai");
describe("emailHandler", () => {
  let getObjectStub: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
  let publishProjektiFileStub: sinon.SinonStub;
  let synchronizeProjektiFilesStub: sinon.SinonStub;
  mockBankHolidays();
  const { emailClientStub } = defaultMocks();

  before(() => {
    getObjectStub = sinon.stub(getS3(), "getObject");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    synchronizeProjektiFilesStub = sinon.stub(aineistoSynchronizerService, "synchronizeProjektiFiles");
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  describe("sendEmailsByToiminto", () => {
    let fixture: ProjektiFixture;
    let personSearchFixture: PersonSearchFixture;

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
      loadProjektiByOidStub.resolves(fixture.dbProjekti5());
      awsMockResolves(getObjectStub, {
        Body: new Readable(),
        ContentType: "application/pdf",
      });
    });

    describe("sendWaitingApprovalMail", () => {
      it("should send email to projektipaallikko succesfully", async () => {
        const emailOptions = await createAloituskuulutusHyvaksyttavanaEmail(fixture.dbProjekti5());
        expect(emailOptions.subject).to.eq("Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ELY/2/2022");

        expect(emailOptions.text).to.eq(
          "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi\n" +
            "Testiprojekti 2\n" +
            "on luotu aloituskuulutus, joka odottaa hyväksyntääsi.\n" +
            "Voit tarkastella projektia osoitteessa https://localhost:3000/yllapito/projekti/5\n" +
            "Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata."
        );
        expect(emailOptions.to).to.eql(["pekka.projari@vayla.fi"]);
      });
    });

    describe("sendApprovalMailsAndAttachments", () => {
      it("should send emails and attachments succesfully", async () => {
        publishProjektiFileStub.resolves();
        synchronizeProjektiFilesStub.resolves();
        updateAloitusKuulutusJulkaisuStub.resolves();
        awsMockResolves(getObjectStub, {
          Body: new Readable(),
          ContentType: "application/pdf",
        });

        const projekti = fixture.dbProjekti5();

        await aloitusKuulutusTilaManager.approve(projekti, UserFixture.pekkaProjari);
        expectAwsCalls(getObjectStub);
        emailClientStub.verifyEmailsSent();
      });
    });
  });
});
