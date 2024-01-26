import { describe } from "mocha";
import * as sinon from "sinon";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { UserFixture } from "../fixture/userFixture";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { userService } from "../../src/user";
import { MuistutusInput } from "hassu-common/graphql/apiModel";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { emailClient } from "../../src/email/email";
import { DBMuistuttaja, muistutusHandler } from "../../src/muistutus/muistutusHandler";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { S3Mock } from "../aws/awsMock";

import { assert, expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

describe("apiHandler", () => {
  const userFixture = new UserFixture(userService);
  new S3Mock();

  afterEach(() => {
    sinon.restore();
    userFixture.logout();
  });

  describe("handleEvent", () => {
    let fixture: ProjektiFixture;
    let personSearchFixture: PersonSearchFixture;
    let loadProjektiByOidStub: sinon.SinonStub;
    let sendEmailStub: sinon.SinonStub;
    let sendTurvapostiEmailStub: sinon.SinonStub;
    let getKayttajasStub: sinon.SinonStub;
    let kirjaamoOsoitteetStub: sinon.SinonStub;

    beforeEach(() => {
      getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
      loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
      sendEmailStub = sinon.stub(emailClient, "sendEmail");
      sendTurvapostiEmailStub = sinon.stub(emailClient, "sendTurvapostiEmail");
      kirjaamoOsoitteetStub = sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet");

      fixture = new ProjektiFixture();
      personSearchFixture = new PersonSearchFixture();
      getKayttajasStub.resolves(
        Kayttajas.fromKayttajaList([
          personSearchFixture.pekkaProjari,
          personSearchFixture.mattiMeikalainen,
          personSearchFixture.manuMuokkaaja,
          personSearchFixture.createKayttaja("A2"),
        ])
      );
      sendEmailStub.resolves();
      loadProjektiByOidStub.resolves(fixture.dbProjekti3);
      kirjaamoOsoitteetStub.resolves([
        { nimi: "ETELA_POHJANMAAN_ELY", sahkoposti: "kirjaamo.etela-pohjanmaa@ely-keskus.fi" },
        { nimi: "ETELA_SAVO_ELY", sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi" },
        { nimi: "HAME_ELY", sahkoposti: "kirjaamo.hame@ely-keskus.fi" },
        { nimi: "KAAKKOIS_SUOMEN_ELY", sahkoposti: "kirjaamo.kaakkois-suomi@ely-keskus.fi" },
        { nimi: "KAINUUN_ELY", sahkoposti: "kirjaamo.kainuu@ely-keskus.fi" },
        { nimi: "KESKI_SUOMEN_ELY", sahkoposti: "kirjaamo.keski-suomi@ely-keskus.fi" },
        { nimi: "LAPIN_ELY", sahkoposti: "kirjaamo.lappi@ely-keskus.fi" },
        { nimi: "PIRKANMAAN_ELY", sahkoposti: "kirjaamo.pirkanmaa@ely-keskus.fi" },
        { nimi: "POHJANMAAN_ELY", sahkoposti: "kirjaamo.pohjanmaa@ely-keskus.fi" },
        { nimi: "POHJOIS_KARJALAN_ELY", sahkoposti: "kirjaamo.pohjois-karjala@ely-keskus.fi" },
        { nimi: "POHJOIS_POHJANMAAN_ELY", sahkoposti: "kirjaamo.pohjois-pohjanmaa@ely-keskus.fi" },
        { nimi: "POHJOIS_SAVON_ELY", sahkoposti: "kirjaamo.pohjois-savo@ely-keskus.fi" },
        { nimi: "SATAKUNNAN_ELY", sahkoposti: "kirjaamo.satakunta@ely-keskus.fi" },
        { nimi: "UUDENMAAN_ELY", sahkoposti: "kirjaamo.uusimaa@ely-keskus.fi" },
        { nimi: "VARSINAIS_SUOMEN_ELY", sahkoposti: "kirjaamo.varsinais-suomi@ely-keskus.fi" },
        { nimi: "VAYLAVIRASTO", sahkoposti: "kirjaamo@vayla.fi" },
      ]);
    });

    describe("lisaaMuistutus", () => {
      it("should send email only to kirjaamo", async () => {
        const dbMockClient = mockClient(DynamoDBDocumentClient);
        const muistutusInput: MuistutusInput = {
          etunimi: "Mika",
          sukunimi: "Muistuttaja",
          katuosoite: "Muistojentie 1 a",
          postinumeroJaPostitoimipaikka: "00100 Helsinki",
          sahkoposti: undefined,
          puhelinnumero: "040123123",
          muistutus: "Hei. Haluaisin vain muistuttaa, että pihatieni yli täytyy rakentaa silta tai muu ratkaisu",
          liite: undefined,
        };

        await muistutusHandler.kasitteleMuistutus({ oid: fixture.PROJEKTI3_OID, muistutus: muistutusInput });

        sinon.assert.calledOnce(sendTurvapostiEmailStub);
        const calls = sendTurvapostiEmailStub.getCalls();
        expect(calls[0].args[0].to).to.equal("kirjaamo.uusimaa@ely-keskus.fi");
        expect(dbMockClient.commandCalls(UpdateCommand).length).to.equal(1);
        expect(dbMockClient.commandCalls(PutCommand).length).to.equal(1);
        const m = dbMockClient.commandCalls(PutCommand)[0].args[0].input.Item as DBMuistuttaja
        expect(m.etunimi).to.equal("Mika");
        expect(m.sukunimi).to.equal("Muistuttaja");
        expect(m.sahkoposti).to.equal(undefined);
        expect(m.lahiosoite).to.equal("Muistojentie 1 a");
        expect(m.postinumero).to.equal("00100");
        expect(m.postitoimipaikka).to.equal("Helsinki");
        expect(m.puhelinnumero).to.equal("040123123");
        const updateCommand = dbMockClient.commandCalls(UpdateCommand)[0];
        assert(updateCommand.args[0].input.ExpressionAttributeValues);
        expect(updateCommand.args[0].input.ExpressionAttributeValues[":id"][0]).to.equal(m.id);
        assert(updateCommand.args[0].input.ExpressionAttributeNames);
        expect(updateCommand.args[0].input.ExpressionAttributeNames["#m"]).to.equal("muistuttajat");
      });

      it("should send emails to kirjaamo and muistuttaja successfully", async () => {
        mockClient(DynamoDBDocumentClient);
        const muistutusInput: MuistutusInput = {
          etunimi: "Mika",
          sukunimi: "Muistuttaja",
          katuosoite: undefined,
          postinumeroJaPostitoimipaikka: undefined,
          sahkoposti: "mika.muistuttaja@mikamuistutta.ja",
          puhelinnumero: undefined,
          muistutus: "Hei. Haluaisin vain muistuttaa, että pihatieni yli täytyy rakentaa silta tai muu ratkaisu",
          liite: undefined,
        };

        await muistutusHandler.kasitteleMuistutus({ oid: fixture.PROJEKTI3_OID, muistutus: muistutusInput });

        // Muistuttajalle sähköposti normaalia reittiä
        sinon.assert.callCount(sendEmailStub, 1);
        let calls = sendEmailStub.getCalls();
        expect(calls).to.have.length(1);
        expect(
          calls.map((call) => {
            return call.args[0].to;
          })
        ).to.have.members(["mika.muistuttaja@mikamuistutta.ja"]);

        // Kirjaamoon sähköposti turvapostin kautta
        sinon.assert.callCount(sendTurvapostiEmailStub, 1);
        calls = sendTurvapostiEmailStub.getCalls();
        expect(calls).to.have.length(1);
        expect(
          calls.map((call) => {
            return call.args[0].to;
          })
        ).to.have.members(["kirjaamo.uusimaa@ely-keskus.fi"]);
      });
    });
  });
});
