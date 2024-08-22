import { SQSRecord } from "aws-lambda";
import {
  OmistajaHakuEvent,
  handleEvent,
  setClient,
  tallennaKiinteistonOmistajat,
  tuoKarttarajausJaTallennaKiinteistotunnukset,
} from "../../src/mml/kiinteistoHandler";
import { MmlClient } from "../../src/mml/mmlClient";
import { BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { assert, expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { setLogContextOid } from "../../src/logger";
import { identifyMockUser } from "../../src/user/userService";
import { config } from "../../src/config";
import { DBOmistaja } from "../../src/database/omistajaDatabase";
import { IllegalArgumentError } from "hassu-common/error";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { parameters } from "../../src/aws/parameters";
import sinon from "sinon";
import MockDate from "mockdate";
import { PrhClient } from "../../src/mml/prh/prh";

const mockMmlClient: MmlClient = {
  haeLainhuutotiedot: () => {
    return Promise.resolve([
      {
        kiinteistotunnus: "1",
        omistajat: [
          {
            henkilotunnus: "111111-111A",
            etunimet: "Matti",
            sukunimi: "Testaaja",
          },
          {
            henkilotunnus: "111111-113B",
            etunimet: "Teppo",
            sukunimi: "Testaaja",
          },
        ],
      },
      {
        kiinteistotunnus: "2",
        omistajat: [
          {
            henkilotunnus: "222222-222A",
            etunimet: "Lotta",
            sukunimi: "Testaaja",
          },
        ],
      },
      {
        kiinteistotunnus: "3",
        omistajat: [
          {
            etunimet: "Jatta",
            sukunimi: "Tuntematon",
          },
        ],
      },
      {
        kiinteistotunnus: "4",
        omistajat: [
          {
            nimi: "Yritys Oy Ab",
            ytunnus: "123-456",
          },
        ],
      },
      {
        kiinteistotunnus: "5",
        omistajat: [],
      },
    ]);
  },
  haeYhteystiedot: () => {
    return Promise.resolve([
      {
        kiinteistotunnus: "1",
        omistajat: [
          {
            etunimet: "Matti",
            sukunimi: "Testaaja",
            yhteystiedot: { jakeluosoite: "Katuosoite 1 A 100", postinumero: "00100", paikkakunta: "Helsinki", maakoodi: "FI" },
          },
          {
            etunimet: "Teppo",
            sukunimi: "Testaaja",
            yhteystiedot: { jakeluosoite: "Katuosoite 2 B 32", postinumero: "01600", paikkakunta: "Vantaa" },
          },
        ],
      },
      {
        kiinteistotunnus: "2",
        omistajat: [
          {
            etunimet: "Lotta",
            sukunimi: "Testaaja",
            yhteystiedot: { jakeluosoite: "Katuosoite 3 A 123", postinumero: "00180", paikkakunta: "Helsinki" },
          },
        ],
      },
      {
        kiinteistotunnus: "3",
        omistajat: [
          {
            etunimet: "Jatta",
            sukunimi: "Tuntematon",
            yhteystiedot: { jakeluosoite: "Katuosoite 123", postinumero: "00180", paikkakunta: "Helsinki" },
          },
        ],
      },
      {
        kiinteistotunnus: "4",
        omistajat: [
          {
            nimi: "Yritys Oy Ab",
            yhteystiedot: { jakeluosoite: "Yritysosoite 1", postinumero: "00001", paikkakunta: "Helsinki" },
          },
        ],
      },
      {
        kiinteistotunnus: "5",
        omistajat: [],
      },
    ]);
  },
  haeTiekunnat: () => {
    return Promise.resolve([]);
  },
  haeYhteisalueet: () => {
    return Promise.resolve([]);
  },
};

const mockPrhClient: PrhClient = {
  haeYritykset: () => Promise.resolve({ response: {} }),
}

describe("kiinteistoHandler", () => {
  const time = "2024-02-23T12:32:54+02:00";
  after(() => {
    setClient(undefined, undefined);
  });

  before(() => {
    setClient(mockMmlClient, mockPrhClient);
    MockDate.set(time);
  });

  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    setLogContextOid("1");
    identifyMockUser({ etunimi: "", sukunimi: "", uid: "testuid", __typename: "NykyinenKayttaja" });
  });

  it("tallenna kiinteistön omistajat", async () => {
    const event: OmistajaHakuEvent = { oid: "1.2.3", uid: "test", kiinteistotunnukset: ["1", "2", "3", "4", "5"] };
    const record: SQSRecord = { body: JSON.stringify(event) } as unknown as SQSRecord;
    const dbMock = mockClient(DynamoDBDocumentClient);
    await handleEvent({ Records: [record] });
    dbMock.on(BatchWriteCommand).resolves({});
    expect(dbMock.commandCalls(BatchWriteCommand).length).to.be.equal(1);
    const writeCommand = dbMock.commandCalls(BatchWriteCommand)[0];
    assert(writeCommand.args[0].input.RequestItems);
    expect(writeCommand.args[0].input.RequestItems[config.kiinteistonomistajaTableName].length).to.be.equal(6);
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(2);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    const updateCommand2 = dbMock.commandCalls(UpdateCommand)[1];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajahaku"].virhe).to.be.equal(false);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajahaku"].kaynnistetty).to.be.equal(time);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajahaku"].kiinteistotunnusMaara).to.be.equal(5);
    assert(updateCommand2.args[0].input.ExpressionAttributeValues);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":omistajahaku"].virhe).to.be.equal(false);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":omistajahaku"].kaynnistetty).to.be.equal(null);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":omistajahaku"].kiinteistotunnusMaara).to.be.equal(null);
    const snapshot: DBOmistaja[] = [];
    writeCommand.args[0].input.RequestItems[config.kiinteistonomistajaTableName].forEach((c, i) => {
      snapshot.push({ ...c.PutRequest?.Item, id: `${i}`, lisatty: "", expires: 0 } as DBOmistaja);
    });
    expect(snapshot).toMatchSnapshot();
  });

  it("päivitä ja poista kiinteistön omistajia", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    const omistajaIdt = ["11", "22"];
    const muutOmistajaIdt = ["33", "44"];
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({
      Item: { id: "1", kayttoOikeudet: [{ kayttajatunnus: "testuid" }] },
    });
    dbMock
      .on(QueryCommand, {
        TableName: config.kiinteistonomistajaTableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeValues: {
          ":oid": "1",
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
          { id: omistajaIdt[0], oid: "1", etunimet: "Teppo", sukunimi: "Tepon sukunimi", suomifiLahetys: true },
          { id: omistajaIdt[1], oid: "1", etunimet: "Marko", sukunimi: "Markon sukunimi", suomifiLahetys: true },
          { id: muutOmistajaIdt[0], oid: "1", etunimet: "Jarkko", sukunimi: "Jarkon sukunimi", suomifiLahetys: false },
          { id: muutOmistajaIdt[1], oid: "1", etunimet: "Sini", sukunimi: "Sinin sukunimi", suomifiLahetys: false },
        ],
      });
    await tallennaKiinteistonOmistajat({
      oid: "1",
      muutOmistajat: [
        {
          id: "33",
          kiinteistotunnus: "1",
          jakeluosoite: "Osoite 2",
          postinumero: "00100",
          paikkakunta: "Helsinki",
        },
        {
          kiinteistotunnus: "2",
          nimi: "Matti Ruohonen",
          jakeluosoite: "Osoite 1",
          postinumero: "01000",
          paikkakunta: "Vantaa",
        },
      ],
      poistettavatOmistajat: ["11", "44"],
    });

    expect(dbMock.commandCalls(PutCommand).length).to.be.equal(2);
    const putCommand = dbMock.commandCalls(PutCommand)[0];
    const o1 = putCommand.args[0].input.Item as DBOmistaja;
    expect(o1.id).to.be.equal("33");
    expect(o1.jakeluosoite).to.be.equal("Osoite 2");
    expect(o1.postinumero).to.be.equal("00100");
    expect(o1.paikkakunta).to.be.equal("Helsinki");
    const putCommand2 = dbMock.commandCalls(PutCommand)[1];
    const o2 = putCommand2.args[0].input.Item as DBOmistaja;
    expect([...omistajaIdt, ...muutOmistajaIdt]).to.not.have.members([o2.id]);
    expect(o2.nimi).to.be.equal("Matti Ruohonen");
    expect(o2.jakeluosoite).to.be.equal("Osoite 1");
    expect(o2.postinumero).to.be.equal("01000");
    expect(o2.paikkakunta).to.be.equal("Vantaa");
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(2);
    const updateCommand1 = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand1.args[0].input.ExpressionAttributeValues);
    expect(updateCommand1.args[0].input.Key).to.eql({ oid: "1", id: "11" });
    expect(updateCommand1.args[0].input.ExpressionAttributeValues[":kaytossa"]).to.be.false;
    const updateCommand2 = dbMock.commandCalls(UpdateCommand)[1];
    assert(updateCommand2.args[0].input.ExpressionAttributeValues);
    expect(updateCommand2.args[0].input.Key).to.eql({ oid: "1", id: "44" });
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":kaytossa"]).to.be.false;
  });

  it("heittää virhettä olemattoman omistajan poistamisesta", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    const omistajaIdt = ["11", "22"];
    const muutOmistajaIdt = ["33", "44"];
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({
      Item: { id: "1", kayttoOikeudet: [{ kayttajatunnus: "testuid" }] },
    });
    dbMock
      .on(QueryCommand, {
        TableName: config.kiinteistonomistajaTableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeValues: {
          ":oid": "1",
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
          { id: omistajaIdt[0], oid: "1", etunimet: "Teppo", sukunimi: "Tepon sukunimi", suomifiLahetys: true },
          { id: omistajaIdt[1], oid: "1", etunimet: "Marko", sukunimi: "Markon sukunimi", suomifiLahetys: true },
          { id: muutOmistajaIdt[0], oid: "1", etunimet: "Jarkko", sukunimi: "Jarkon sukunimi", suomifiLahetys: false },
          { id: muutOmistajaIdt[1], oid: "1", etunimet: "Sini", sukunimi: "Sinin sukunimi", suomifiLahetys: false },
        ],
      });
    await expect(
      tallennaKiinteistonOmistajat({
        oid: "1",
        muutOmistajat: [
          {
            id: "33",
            kiinteistotunnus: "1",
            jakeluosoite: "Osoite 2",
            postinumero: "00100",
            paikkakunta: "Helsinki",
          },
          {
            kiinteistotunnus: "2",
            nimi: "Matti Ruohonen",
            jakeluosoite: "Osoite 1",
            postinumero: "01000",
            paikkakunta: "Vantaa",
          },
        ],
        poistettavatOmistajat: ["77"],
      })
    ).to.eventually.rejectedWith(IllegalArgumentError, "Poistettavaa omistajaa id: '77' ei löytynyt");
  });

  it("heittää virhettä jos muokattava omistaja ei ole muuOmistaja", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    const omistajaIdt = ["11", "22"];
    const muutOmistajaIdt = ["33", "44"];
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({
      Item: { id: "1", kayttoOikeudet: [{ kayttajatunnus: "testuid" }] },
    });
    dbMock
      .on(QueryCommand, {
        TableName: config.kiinteistonomistajaTableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeValues: {
          ":oid": "1",
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
          { id: omistajaIdt[0], oid: "1", etunimet: "Teppo", sukunimi: "Tepon sukunimi", suomifiLahetys: true },
          { id: omistajaIdt[1], oid: "1", etunimet: "Marko", sukunimi: "Markon sukunimi", suomifiLahetys: true },
          { id: muutOmistajaIdt[0], oid: "1", etunimet: "Jarkko", sukunimi: "Jarkon sukunimi", suomifiLahetys: false },
          { id: muutOmistajaIdt[1], oid: "1", etunimet: "Sini", sukunimi: "Sinin sukunimi", suomifiLahetys: false },
        ],
      });
    await expect(
      tallennaKiinteistonOmistajat({
        oid: "1",
        muutOmistajat: [
          {
            id: "11",
            kiinteistotunnus: "1",
            jakeluosoite: "Osoite 2",
            postinumero: "00100",
            paikkakunta: "Helsinki",
          },
        ],
        poistettavatOmistajat: [],
      })
    ).to.eventually.rejectedWith(IllegalArgumentError, "Tallennettava omistaja id:'11' ei ole muutOmistajat listalla");
  });

  it("heittää virhettä jos poistettavaa omistajaa yritetään muokata", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    const omistajaIdt = ["11", "22"];
    const muutOmistajaIdt = ["33", "44"];
    dbMock.on(GetCommand, { TableName: config.projektiTableName }).resolves({
      Item: { id: "1", kayttoOikeudet: [{ kayttajatunnus: "testuid" }] },
    });
    dbMock
      .on(QueryCommand, {
        TableName: config.kiinteistonomistajaTableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeValues: {
          ":oid": "1",
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
          { id: omistajaIdt[0], oid: "1", etunimet: "Teppo", sukunimi: "Tepon sukunimi", suomifiLahetys: true },
          { id: omistajaIdt[1], oid: "1", etunimet: "Marko", sukunimi: "Markon sukunimi", suomifiLahetys: true },
          { id: muutOmistajaIdt[0], oid: "1", etunimet: "Jarkko", sukunimi: "Jarkon sukunimi", suomifiLahetys: false },
          { id: muutOmistajaIdt[1], oid: "1", etunimet: "Sini", sukunimi: "Sinin sukunimi", suomifiLahetys: false },
        ],
      });
    await expect(
      tallennaKiinteistonOmistajat({
        oid: "1",
        muutOmistajat: [
          {
            id: "33",
            kiinteistotunnus: "1",
            jakeluosoite: "Osoite 2",
            postinumero: "00100",
            paikkakunta: "Helsinki",
          },
        ],
        poistettavatOmistajat: ["33"],
      })
    ).to.eventually.rejectedWith(IllegalArgumentError, "Tallennettava omistaja id:'33' ei ole muutOmistajat listalla");
  });
  it("tuoKarttarajausJaTallennaKiinteistotunnukset testiympäristö", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    sinon.stub(parameters, "getKiinteistoSQSUrl").resolves("");
    dbMock
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1", kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    const sqsMock = mockClient(SQSClient);
    await tuoKarttarajausJaTallennaKiinteistotunnukset({
      geoJSON: "",
      oid: "1",
      kiinteistotunnukset: ["491001491", "49100263", "227001491"],
    });
    const body = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody;
    assert(body);
    const hakuEvent = JSON.parse(body) as OmistajaHakuEvent;
    expect(hakuEvent.oid).to.equal("1");
    expect(hakuEvent.uid).to.equal("testuid");
    expect(hakuEvent.kiinteistotunnukset.length).to.equal(3);
    expect(hakuEvent.kiinteistotunnukset[0]).to.equal("998001491");
    expect(hakuEvent.kiinteistotunnukset[1]).to.equal("99800263");
    expect(hakuEvent.kiinteistotunnukset[2]).to.equal("227001491");
  });
  it("tuoKarttarajausJaTallennaKiinteistotunnukset tuotantoympäristö", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    sinon.stub(parameters, "getKiinteistoSQSUrl").resolves("");
    sinon.stub(config, "isProd").resolves(true);
    dbMock
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1.2.3", kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    const sqsMock = mockClient(SQSClient);
    await tuoKarttarajausJaTallennaKiinteistotunnukset({
      geoJSON: "",
      oid: "1.2.3",
      kiinteistotunnukset: ["491001491", "49100263", "227001491"],
    });
    const body = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input.MessageBody;
    assert(body);
    const hakuEvent = JSON.parse(body) as OmistajaHakuEvent;
    expect(hakuEvent.oid).to.equal("1.2.3");
    expect(hakuEvent.uid).to.equal("testuid");
    expect(hakuEvent.kiinteistotunnukset.length).to.equal(3);
    expect(hakuEvent.kiinteistotunnukset[0]).to.equal("491001491");
    expect(hakuEvent.kiinteistotunnukset[1]).to.equal("49100263");
    expect(hakuEvent.kiinteistotunnukset[2]).to.equal("227001491");
  });
});
