import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { AwsClientStub, mockClient } from "aws-sdk-client-mock";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { TilasiirtymaToiminto } from "../../../common/graphql/apiModel";
import { getS3Client } from "../../src/aws/clients";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { emailClient } from "../../src/email/email";
import { emailHandler } from "../../src/handler/emailHandler";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";

const { expect } = require("chai");

describe("emailHandler", () => {
  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe("sendEmailsByToiminto", () => {
    let mockS3CLient: AwsClientStub<S3Client>;
    let sendEmailStub: sinon.SinonStub;
    let getKayttajasStub: sinon.SinonStub;
    let loadProjektiByOidStub: sinon.SinonStub;
    let updateAloitusKuulutusJulkaisuStub: sinon.SinonStub;
    let fixture: ProjektiFixture;
    let personSearchFixture: PersonSearchFixture;

    beforeEach(() => {
      mockS3CLient = mockClient(getS3Client());
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
            "Voit tarkastella projektia osoitteessa https://localhost/yllapito/projekti/2\n" +
            "Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.",
          to: "pekka.projari@vayla.fi",
        });
      });
    });

    describe("sendApprovalMailsAndAttachments", () => {
      it("should send emails and attachments succesfully", async () => {
        updateAloitusKuulutusJulkaisuStub.resolves();
        mockS3CLient.on(GetObjectCommand).resolves({});

        await emailHandler.sendEmailsByToiminto(TilasiirtymaToiminto.HYVAKSY, fixture.PROJEKTI2_OID);

        const calls = mockS3CLient.calls();
        expect(calls).to.have.length(2);
        expect(
          calls.map((call) => {
            const input = call.args[0].input as any;
            const { Body: _Body, ...otherArgs } = input;
            return { ...otherArgs };
          })
        ).toMatchSnapshot();
        sinon.assert.callCount(sendEmailStub, 3);
      });
    });
  });
});
