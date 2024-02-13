import { SQSRecord } from "aws-lambda";
import {
  OmistajaHakuEvent,
  haeKiinteistonOmistajat,
  handleEvent,
  setClient,
  tallennaKiinteistonOmistajat,
} from "../../src/mml/kiinteistoHandler";
import { MmlClient } from "../../src/mml/mmlClient";
import {
  BatchGetCommand,
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { assert, expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { setLogContextOid } from "../../src/logger";
import { identifyMockUser } from "../../src/user/userService";
import { config } from "../../src/config";
import { DBOmistaja } from "../../src/database/omistajaDatabase";

const mockMmlClient: MmlClient = {
  haeLainhuutotiedot: () => {
    return new Promise((resolve) => {
      resolve([
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
    });
  },
  haeYhteystiedot: () => {
    return new Promise((resolve) => {
      resolve([
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
    });
  },
};

describe("kiinteistoHandler", () => {
  after(() => {
    setClient(undefined);
  });

  before(() => {
    setClient(mockMmlClient);
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
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(3);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    const updateCommand2 = dbMock.commandCalls(UpdateCommand)[1];
    const updateCommand3 = dbMock.commandCalls(UpdateCommand)[2];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajahakuKaynnissa"]).to.be.equal(true);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajahakuKiinteistotunnusMaara"]).to.be.equal(5);
    assert(updateCommand2.args[0].input.ExpressionAttributeValues);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(4);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(2);
    assert(updateCommand3.args[0].input.ExpressionAttributeValues);
    expect(updateCommand3.args[0].input.ExpressionAttributeValues[":omistajahakuKaynnissa"]).to.be.equal(false);
    expect(updateCommand3.args[0].input.ExpressionAttributeValues[":omistajahakuKiinteistotunnusMaara"]).to.be.equal(null);
    const snapshot: DBOmistaja[] = [];
    writeCommand.args[0].input.RequestItems[config.kiinteistonomistajaTableName].forEach((c, i) => {
      snapshot.push({ ...c.PutRequest?.Item, id: `${i}`, lisatty: "", expires: 0 } as DBOmistaja);
    });
    expect(snapshot).toMatchSnapshot();
  });

  it("päivitä kiinteistön omistajat", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1", omistajat: ["33"], muutOmistajat: ["11"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    dbMock
      .on(GetCommand, { TableName: config.kiinteistonomistajaTableName, Key: { id: "11", oid: "1" } })
      .resolves({ Item: { id: "11", oid: "1", etunimet: "Teppo", sukunimi: "Tepon sukunimi" } });
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
          { id: "11", oid: "1", etunimet: "Teppo", sukunimi: "Tepon sukunimi", suomifiLahetys: false },
          { id: "33", oid: "1", etunimet: "Jouko", sukunimi: "Joukon sukunimi", suomifiLahetys: true },
        ],
      });
    await tallennaKiinteistonOmistajat({
      oid: "1",
      muutOmistajat: [
        {
          id: "11",
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
      poistettavatOmistajat: [],
    });
    expect(dbMock.commandCalls(PutCommand).length).to.be.equal(2);
    const putCommand = dbMock.commandCalls(PutCommand)[0];
    const o1 = putCommand.args[0].input.Item as DBOmistaja;
    expect(o1.jakeluosoite).to.be.equal("Osoite 2");
    expect(o1.postinumero).to.be.equal("00100");
    expect(o1.paikkakunta).to.be.equal("Helsinki");
    const putCommand2 = dbMock.commandCalls(PutCommand)[1];
    const o2 = putCommand2.args[0].input.Item as DBOmistaja;
    expect(o2.nimi).to.be.equal("Matti Ruohonen");
    expect(o2.jakeluosoite).to.be.equal("Osoite 1");
    expect(o2.postinumero).to.be.equal("01000");
    expect(o2.paikkakunta).to.be.equal("Vantaa");
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    console.log(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(1);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(2);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"][0]).to.be.equal("11");
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"][1]).to.be.equal(o2.id);
  });

  it.skip("hae kiinteistön omistajat", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1", omistajat: ["1", "2", "3"], muutOmistajat: ["4"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    dbMock.on(BatchGetCommand).resolves({
      Responses: {
        [config.kiinteistonomistajaTableName]: [
          { id: "1", etunimet: "Matti", jakeluosoite: "Osoite 1", postinumero: "00100", paikkakunta: "Helsinki" },
          { id: "2", etunimet: "Teppo" },
        ],
      },
    });
    const omistajat = await haeKiinteistonOmistajat({ oid: "1", muutOmistajat: false, from: 0, size: 2 });
    expect(dbMock.commandCalls(BatchGetCommand).length).to.be.equal(1);
    let batchCommand = dbMock.commandCalls(BatchGetCommand)[0];
    assert(batchCommand.args[0].input.RequestItems);
    let keys = batchCommand.args[0].input.RequestItems[config.kiinteistonomistajaTableName].Keys;
    assert(keys);
    expect(keys.length).to.be.equal(2);
    expect(keys[0].id).to.be.equal("1");
    expect(keys[1].id).to.be.equal("2");
    expect(omistajat.hakutulosMaara).to.be.equal(3);
    expect(omistajat.omistajat[0]?.id).to.be.equal("1");
    expect(omistajat.omistajat[0]?.etunimet).to.be.equal("Matti");
    expect(omistajat.omistajat[0]?.jakeluosoite).to.be.equal("Osoite 1");
    expect(omistajat.omistajat[0]?.postinumero).to.be.equal("00100");
    expect(omistajat.omistajat[0]?.paikkakunta).to.be.equal("Helsinki");
    expect(omistajat.omistajat[1]?.id).to.be.equal("2");
    expect(omistajat.omistajat[1]?.etunimet).to.be.equal("Teppo");
    await haeKiinteistonOmistajat({ oid: "1", muutOmistajat: false, from: 2, size: 2 });
    expect(dbMock.commandCalls(BatchGetCommand).length).to.be.equal(2);
    batchCommand = dbMock.commandCalls(BatchGetCommand)[1];
    assert(batchCommand.args[0].input.RequestItems);
    keys = batchCommand.args[0].input.RequestItems[config.kiinteistonomistajaTableName].Keys;
    assert(keys);
    expect(keys.length).to.be.equal(1);
    expect(keys[0].id).to.be.equal("3");
  });
});
