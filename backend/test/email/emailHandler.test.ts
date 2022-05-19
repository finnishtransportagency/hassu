import { describe, it } from "mocha";
import * as sinon from "sinon";
import { TilasiirtymaToiminto } from "../../../common/graphql/apiModel";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { emailClient } from "../../src/email/email";
import { emailHandler } from "../../src/handler/emailHandler";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";

const { expect } = require("chai");

describe("emailHandler", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
    AWSMock.restore();
  });

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
  });

  describe("sendEmailsByToiminto", () => {
    let s3Stub: sinon.SinonStub;
    let sendEmailStub: sinon.SinonStub;
    let getKayttajasStub: sinon.SinonStub;
    let loadProjektiByOidStub: sinon.SinonStub;
    let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
    let fixture: ProjektiFixture;
    let personSearchFixture: PersonSearchFixture;

    beforeEach(() => {
      s3Stub = sinon.stub();
      sendEmailStub = sinon.stub(emailClient, "sendEmail");
      getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
      loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
      updateAloitusKuulutusJulkaisuStub = sinon.stub(projektiDatabase, "updateAloitusKuulutusJulkaisu");
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
      loadProjektiByOidStub.resolves(fixture.dbProjekti2);
    });

    describe("sendWaitingApprovalMail", () => {
      it("should send email to projektipaallikko succesfully", async () => {
        await emailHandler.sendEmailsByToiminto(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, fixture.PROJEKTI2_OID);

        sinon.assert.calledOnce(sendEmailStub);
        sinon.assert.calledWith(sendEmailStub, {
          subject: "Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ",
          text:
            "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi\n" +
            "Testiprojekti 2 email lahetys\n" +
            "on luotu aloituskuulutus, joka odottaa hyväksyntääsi.\n" +
            "Voit tarkastella projektia osoitteessa https://localhost:3000/yllapito/projekti/2\n" +
            "Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.",
          to: "pekka.projari@vayla.fi",
        });
      });
    });

    describe("sendApprovalMailsAndAttachments", () => {
      it("should send emails and attachments succesfully", async () => {
        updateAloitusKuulutusJulkaisuStub.resolves();
        AWSMock.mock("S3", "getObject", s3Stub);
        s3Stub.resolves({});

        await emailHandler.sendEmailsByToiminto(TilasiirtymaToiminto.HYVAKSY, fixture.PROJEKTI2_OID);

        const calls = s3Stub.getCalls();
        expect(calls).to.have.length(2);
        expect(
          calls.map((call) => {
            return { ...call.args[0] };
          })
        ).toMatchSnapshot();
        sinon.assert.callCount(sendEmailStub, 3);
      });
    });
  });
});
