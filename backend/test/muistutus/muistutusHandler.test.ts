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
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../../src/config";
import { identifyMockUser } from "../../src/user/userService";
import { parameters } from "../../src/aws/parameters";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DBMuistuttaja } from "../../src/database/muistuttajaDatabase";
import { SuomiFiCognitoKayttaja } from "../../src/user/suomiFiCognitoKayttaja";
import MockDate from "mockdate";
import { IllegalArgumentError } from "hassu-common/error";
import { mockUUID } from "../../integrationtest/shared/sharedMock";

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
          puhelinnumero: "0501234567",
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
      const oid = "1.2.3";
      const muistuttajaIdt = ["11", "22"];
      const muutMuistuttajaIdt = ["33", "44"];
      mockUUID();

      beforeEach(() => {
        identifyMockUser({ etunimi: "", sukunimi: "", uid: "testuid", __typename: "NykyinenKayttaja" });
        loadProjektiByOidStub.restore();
      });

      it("should handle deleting and saving of muistuttajat", async () => {
        const dbMock = initializeDbMockForTallennaTest(oid, muutMuistuttajaIdt, muistuttajaIdt);
        await muistutusHandler.tallennaMuistuttajat({
          oid,
          muutMuistuttajat: [
            {
              id: muutMuistuttajaIdt[0],
              nimi: "Jarkko Jankkinen",
              maakoodi: "FI",
              jakeluosoite: "Lähitie 14",
              paikkakunta: "Parikkala",
              postinumero: "03300",
              sahkoposti: "jarkko@jankkinen.fi",
              tiedotustapa: "email",
            },
            {
              // uusi käsin lisätty käyttäjä (id puuttuu)
              nimi: "Jere Testinen",
              maakoodi: "FI",
              jakeluosoite: "Lähitie 16",
              paikkakunta: "Parikkala",
              postinumero: "03300",
              sahkoposti: "jere@testinen.fi",
              tiedotustapa: "email",
            },
          ],
          poistettavatMuistuttajat: [muistuttajaIdt[1], muutMuistuttajaIdt[1]],
        });

        expect(dbMock.commandCalls(PutCommand).length).to.be.equal(2);
        const putCommand = dbMock.commandCalls(PutCommand)[0];
        const o1 = putCommand.args[0].input.Item as DBMuistuttaja;
        expect(o1.id).to.be.equal("33");
        expect(o1.oid).to.be.equal(oid);
        expect(o1.nimi).to.be.equal("Jarkko Jankkinen");
        expect(o1.sahkoposti).to.be.equal("jarkko@jankkinen.fi");
        expect(o1.tiedotustapa).to.be.equal("email");
        expect(o1.lahiosoite).to.be.equal("Lähitie 14");
        expect(o1.postinumero).to.be.equal("03300");
        expect(o1.postitoimipaikka).to.be.equal("Parikkala");
        expect(o1.maakoodi).to.be.equal("FI");
        const putCommand2 = dbMock.commandCalls(PutCommand)[1];
        const o2 = putCommand2.args[0].input.Item as DBMuistuttaja;
        expect([...muistuttajaIdt, ...muutMuistuttajaIdt]).to.not.have.members([o2.id]);
        expect(o2.oid).to.be.equal(oid);
        expect(o2.nimi).to.be.equal("Jere Testinen");
        expect(o2.sahkoposti).to.be.equal("jere@testinen.fi");
        expect(o2.tiedotustapa).to.be.equal("email");
        expect(o2.lahiosoite).to.be.equal("Lähitie 16");
        expect(o2.postinumero).to.be.equal("03300");
        expect(o2.postitoimipaikka).to.be.equal("Parikkala");
        expect(o2.maakoodi).to.be.equal("FI");
        expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(2);
        const updateCommand1 = dbMock.commandCalls(UpdateCommand)[0];
        assert(updateCommand1.args[0].input.ExpressionAttributeValues);
        expect(updateCommand1.args[0].input.Key).to.eql({ oid, id: "22" });
        expect(updateCommand1.args[0].input.ExpressionAttributeValues[":kaytossa"]).to.be.false;
        const updateCommand2 = dbMock.commandCalls(UpdateCommand)[1];
        assert(updateCommand2.args[0].input.ExpressionAttributeValues);
        expect(updateCommand2.args[0].input.Key).to.eql({ oid, id: "44" });
        expect(updateCommand2.args[0].input.ExpressionAttributeValues[":kaytossa"]).to.be.false;
      });

      it("should throw when trying to save non existent muistuttaja", async () => {
        initializeDbMockForTallennaTest(oid, muutMuistuttajaIdt, muistuttajaIdt);
        await expect(
          muistutusHandler.tallennaMuistuttajat({
            oid,
            muutMuistuttajat: [
              {
                id: "66",
                nimi: "Jarkko Jankkinen",
                maakoodi: "FI",
                jakeluosoite: "Lähitie 14",
                paikkakunta: "Parikkala",
                postinumero: "03300",
                sahkoposti: "jarkko@jankkinen.fi",
                tiedotustapa: "email",
              },
            ],
            poistettavatMuistuttajat: [],
          })
        ).to.eventually.rejectedWith(IllegalArgumentError, "Tallennettava muistuttaja id:'66' ei ole muutMuistuttajat listalla");
      });

      it("should throw when trying to edit suomi.fi-tiedotettava muistuttaja", async () => {
        initializeDbMockForTallennaTest(oid, muutMuistuttajaIdt, muistuttajaIdt);
        await expect(
          muistutusHandler.tallennaMuistuttajat({
            oid,
            muutMuistuttajat: [{ id: muistuttajaIdt[0] }],
            poistettavatMuistuttajat: [],
          })
        ).to.eventually.rejectedWith(
          IllegalArgumentError,
          `Tallennettava muistuttaja id:'${muistuttajaIdt[0]}' ei ole muutMuistuttajat listalla`
        );
      });

      it("should throw when trying to delete non existent muistuttaja", async () => {
        initializeDbMockForTallennaTest(oid, muutMuistuttajaIdt, muistuttajaIdt);
        await expect(
          muistutusHandler.tallennaMuistuttajat({
            oid,
            muutMuistuttajat: [],
            poistettavatMuistuttajat: ["66"],
          })
        ).to.eventually.rejectedWith(IllegalArgumentError, "Poistettavaa muistuttajaa id: '66' ei löytynyt");
      });
    });
  });
});

function initializeDbMockForTallennaTest(oid: string, muutMuistuttajaIdt: string[], muistuttajaIdt: string[]) {
  const dbMock = mockClient(DynamoDBDocumentClient);
  dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({
    Item: {
      oid,
      muutMuistuttajat: muutMuistuttajaIdt,
      muistuttajat: muistuttajaIdt,
      kayttoOikeudet: [{ kayttajatunnus: "testuid" }],
    },
  });
  dbMock
    .on(QueryCommand, {
      TableName: config.projektiMuistuttajaTableName,
      KeyConditionExpression: "#oid = :oid",
      ExpressionAttributeValues: {
        ":oid": oid,
        ":kaytossa": true,
      },
      ExpressionAttributeNames: {
        "#oid": "oid",
        "#kaytossa": "kaytossa",
      },
      FilterExpression: "#kaytossa = :kaytossa",
    })
    .resolves({
      Items: [
        { id: muistuttajaIdt[0], oid, etunimi: "Teppo", sukunimi: "Tepon sukunimi", suomifiLahetys: true },
        { id: muistuttajaIdt[1], oid, etunimi: "Marko", sukunimi: "Markon sukunimi", suomifiLahetys: true },
        { id: muutMuistuttajaIdt[0], oid, nimi: "Jarkko Jakkinen", suomifiLahetys: false },
        { id: muutMuistuttajaIdt[1], oid, nimi: "Sini Sininen", suomifiLahetys: false },
      ],
    });
  return dbMock;
}
