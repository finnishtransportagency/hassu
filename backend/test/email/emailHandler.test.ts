import { describe, it } from "mocha";
import * as sinon from "sinon";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { emailClient } from "../../src/email/email";
import { emailHandler } from "../../src/handler/emailHandler";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Readable } from "stream";
import { awsMockResolves, expectAwsCalls } from "../aws/awsMock";
import { getS3 } from "../../src/aws/client";

describe("emailHandler", () => {
  let getObjectStub: sinon.SinonStub;
  let sendEmailStub: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let loadProjektiByOidStub: sinon.SinonStub;
  let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;

  before(() => {
    getObjectStub = sinon.stub(getS3(), "getObject");
    sendEmailStub = sinon.stub(emailClient, "sendEmail");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase.aloitusKuulutusJulkaisut, "update");
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
      sendEmailStub.resolves();
      loadProjektiByOidStub.resolves(fixture.dbProjekti2());

      awsMockResolves(getObjectStub, {
        Body: new Readable(),
      });
    });

    describe("sendWaitingApprovalMail", () => {
      it("should send email to projektipaallikko succesfully", async () => {
        await emailHandler.sendEmailsByToiminto(
          TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
          fixture.PROJEKTI2_OID,
          TilasiirtymaTyyppi.ALOITUSKUULUTUS
        );

        sinon.assert.calledOnce(sendEmailStub);
        sinon.assert.calledWith(sendEmailStub, {
          subject: "Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ELY/2/2022",
          text:
            "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi\n" +
            "Testiprojekti 2\n" +
            "on luotu aloituskuulutus, joka odottaa hyväksyntääsi.\n" +
            "Voit tarkastella projektia osoitteessa https://localhost:3000/yllapito/projekti/2\n" +
            "Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.",
          to: ["pekka.projari@vayla.fi"],
        });
      });
    });

    describe("sendApprovalMailsAndAttachments", () => {
      it("should send emails and attachments succesfully", async () => {
        updateAloitusKuulutusJulkaisuStub.resolves();
        awsMockResolves(getObjectStub, {
          Body: new Readable(),
        });

        await emailHandler.sendEmailsByToiminto(TilasiirtymaToiminto.HYVAKSY, fixture.PROJEKTI2_OID, TilasiirtymaTyyppi.ALOITUSKUULUTUS);

        expectAwsCalls(getObjectStub);
        sinon.assert.callCount(sendEmailStub, 3);
      });
    });
  });
});
