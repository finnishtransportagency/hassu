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
import { muistutusHandler } from "../../src/muistutus/muistutusHandler";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { S3Mock } from "../aws/awsMock";

import { assert, expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../src/config";
import { identifyMockUser } from "../../src/user/userService";
import { fail } from "assert";
import { parameters } from "../../src/aws/parameters";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DBMuistuttaja } from "../../src/database/muistuttajaDatabase";
import { SuomiFiCognitoKayttaja } from "../../src/user/suomiFiCognitoKayttaja";
import MockDate from "mockdate";

describe("muistutusHandler", () => {
  const userFixture = new UserFixture(userService);
  new S3Mock();

  afterEach(() => {
    sinon.restore();
    userFixture.logout();
    MockDate.reset();
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
      sinon.stub(parameters, "getSuomiFiSQSUrl");

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
        sinon
          .stub(muistutusHandler, "getLoggedInUser")
          .returns({ "custom:hetu": "12123-041212", given_name: "Mika", family_name: "Muistuttaja" } as SuomiFiCognitoKayttaja);
        const dbMockClient = mockClient(DynamoDBDocumentClient);
        const sqsMock = mockClient(SQSClient);
        const muistutusInput: MuistutusInput = {
          katuosoite: "Muistojentie 1 a",
          postitoimipaikka: "Helsinki",
          postinumero: "00100",
          maa: "FI",
          sahkoposti: "test@test.fi",
          muistutus: "Hei. Haluaisin vain muistuttaa, että pihatieni yli täytyy rakentaa silta tai muu ratkaisu",
          liitteet: [],
          puhelinnumero: "0501234567"
        };
        MockDate.set("2024-04-09T03:00");
        await muistutusHandler.kasitteleMuistutus({ oid: fixture.PROJEKTI3_OID, muistutus: muistutusInput });

        expect(sqsMock.commandCalls(SendMessageCommand).length).to.equal(1);
        sinon.assert.calledOnce(sendTurvapostiEmailStub);
        const calls = sendTurvapostiEmailStub.getCalls();
        expect(calls[0].args[0]).toMatchSnapshot();
        expect(dbMockClient.commandCalls(UpdateCommand).length).to.equal(1);
        expect(dbMockClient.commandCalls(PutCommand).length).to.equal(1);
        const m = dbMockClient.commandCalls(PutCommand)[0].args[0].input.Item as DBMuistuttaja;
        expect(m.etunimi).to.equal("Mika");
        expect(m.sukunimi).to.equal("Muistuttaja");
        expect(m.sahkoposti).to.equal("test@test.fi");
        expect(m.puhelinnumero).to.equal("0501234567");
        expect(m.lahiosoite).to.equal("Muistojentie 1 a");
        expect(m.postinumero).to.equal("00100");
        expect(m.postitoimipaikka).to.equal("Helsinki");
        const updateCommand = dbMockClient.commandCalls(UpdateCommand)[0];
        assert(updateCommand.args[0].input.ExpressionAttributeValues);
        expect(updateCommand.args[0].input.ExpressionAttributeValues[":id"][0]).to.equal(m.id);
        assert(updateCommand.args[0].input.ExpressionAttributeNames);
        expect(updateCommand.args[0].input.ExpressionAttributeNames["#m"]).to.equal("muistuttajat");
      });

      it("should send emails to kirjaamo and muistuttaja successfully", async () => {
        mockClient(DynamoDBDocumentClient);
        const sqsMock = mockClient(SQSClient);
        const muistutusInput: MuistutusInput = {
          katuosoite: "Katuosoite 1",
          postitoimipaikka: "Postitoimipaikka1",
          postinumero: "123123",
          maa: "FI",
          sahkoposti: "mika.muistuttaja@mikamuistutta.ja",
          muistutus: "Hei. Haluaisin vain muistuttaa, että pihatieni yli täytyy rakentaa silta tai muu ratkaisu",
          liitteet: [],
        };

        await muistutusHandler.kasitteleMuistutus({ oid: fixture.PROJEKTI3_OID, muistutus: muistutusInput });

        expect(sqsMock.commandCalls(SendMessageCommand).length).to.equal(1);
        // Kirjaamoon sähköposti turvapostin kautta
        sinon.assert.callCount(sendTurvapostiEmailStub, 1);
        const calls = sendTurvapostiEmailStub.getCalls();
        expect(calls).to.have.length(1);
        expect(
          calls.map((call) => {
            return call.args[0].to;
          })
        ).to.have.members(["kirjaamo.uusimaa@ely-keskus.fi"]);
      });
    });
    describe("tallennaMuistuttajat", () => {
      beforeEach(() => {
        loadProjektiByOidStub.restore();
        identifyMockUser({ etunimi: "", sukunimi: "", uid: "testuid", __typename: "NykyinenKayttaja" });
      });

      it("should save muistuttajat", async () => {
        const dbMock = mockClient(DynamoDBDocumentClient);
        dbMock
          .on(GetCommand, { TableName: config.projektiTableName })
          .resolves({ Item: { id: "1.2.3", muutMuistuttajat: ["1", "11"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
        dbMock
          .on(GetCommand, { TableName: config.projektiMuistuttajaTableName, Key: { id: "1", oid: "1.2.3" } })
          .resolves({ Item: { id: "1", nimi: "Matti Teppo" } });
        const muistuttajat = await muistutusHandler.tallennaMuistuttajat({
          oid: "1.2.3",
          muistuttajat: [
            { id: "1", nimi: "Matti Teppo", tiedotusosoite: "matti@teppo.fi", tiedotustapa: "email" },
            { nimi: "Teppo Testaaja", tiedotusosoite: "test@test.fi" },
          ],
        });
        expect(dbMock.commandCalls(PutCommand).length).to.be.equal(2);
        const putCommand = dbMock.commandCalls(PutCommand)[0];
        const o1 = putCommand.args[0].input.Item as DBMuistuttaja;
        expect(o1.nimi).to.be.equal("Matti Teppo");
        expect(o1.tiedotusosoite).to.be.equal("matti@teppo.fi");
        expect(o1.tiedotustapa).to.be.equal("email");
        const putCommand2 = dbMock.commandCalls(PutCommand)[1];
        const o2 = putCommand2.args[0].input.Item as DBMuistuttaja;
        expect(o2.nimi).to.be.equal("Teppo Testaaja");
        expect(o2.tiedotusosoite).to.be.equal("test@test.fi");
        expect(o2.tiedotustapa).to.be.equal(undefined);
        expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
        const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
        assert(updateCommand.args[0].input.ExpressionAttributeValues);
        expect(updateCommand.args[0].input.ExpressionAttributeValues[":id"].length).to.be.equal(1);
        assert(updateCommand.args[0].input.ExpressionAttributeNames);
        expect(updateCommand.args[0].input.ExpressionAttributeNames["#m"]).to.equal("muutMuistuttajat");
        expect(muistuttajat.length).to.equal(2);
        expect(muistuttajat[0].id).to.equal("1");
        expect(muistuttajat[0].nimi).to.equal("Matti Teppo");
        expect(muistuttajat[0].tiedotusosoite).to.equal("matti@teppo.fi");
        expect(muistuttajat[0].tiedotustapa).to.equal("email");
        expect(muistuttajat[1].id !== undefined).to.equal(true);
        expect(muistuttajat[1].nimi).to.equal("Teppo Testaaja");
        expect(muistuttajat[1].tiedotusosoite).to.equal("test@test.fi");
        expect(muistuttajat[1].tiedotustapa).to.equal(undefined);
      });

      it("should not save muistuttajat", async () => {
        const dbMock = mockClient(DynamoDBDocumentClient);
        dbMock.reset();
        dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({
          Item: { oid: "1.2.3", muistuttajat: "1", muutMuistuttajat: ["11"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] },
        });
        dbMock
          .on(GetCommand, { TableName: config.projektiMuistuttajaTableName, Key: { id: "1", oid: "1.2.3" } })
          .resolves({ Item: { id: "11", nimi: "Teppo Testaaja" } });
        try {
          await muistutusHandler.tallennaMuistuttajat({
            oid: "1.2.3",
            muistuttajat: [
              { id: "1", nimi: "Matti Teppo", tiedotusosoite: "matti@teppo.fi", tiedotustapa: "email" },
              { nimi: "Teppo Testaaja", tiedotusosoite: "test@test.fi" },
            ],
          });
          fail("Muistuttajan tallennus ei saisi onnistua");
        } catch (e) {
          assert(e instanceof Error);
          expect(e.message).to.be.equal("Muistuttajaa 1 ei löydy");
        }
      });
    });
    describe("poistaMuistuttaja", () => {
      beforeEach(() => {
        loadProjektiByOidStub.restore();
        identifyMockUser({ etunimi: "", sukunimi: "", uid: "testuid", __typename: "NykyinenKayttaja" });
      });
      it("should delete muistuttaja", async () => {
        const dbMock = mockClient(DynamoDBDocumentClient);
        dbMock.on(GetCommand).resolves({
          Item: { id: "1", muistuttajat: ["1"], muutMuistuttajat: ["2", "3"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] },
        });
        await muistutusHandler.poistaMuistuttaja({ oid: "1", muistuttaja: "2" });
        expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
        const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
        assert(updateCommand.args[0].input.ExpressionAttributeValues);
        expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutMuistuttajat"].length).to.be.equal(1);
        expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutMuistuttajat"][0]).to.be.equal("3");
      });
    });
  });
});
