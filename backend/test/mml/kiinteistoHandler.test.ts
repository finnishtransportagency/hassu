import { SQSRecord } from "aws-lambda";
import {
  DBOmistaja,
  OmistajaHakuEvent,
  haeKiinteistonOmistajat,
  handleEvent,
  poistaKiinteistonOmistaja,
  setClient,
  tallennaKiinteistonOmistajat,
} from "../../src/mml/kiinteistoHandler";
import { MmlClient } from "../../src/mml/mmlClient";
import { BatchGetCommand, BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { assert, expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { setLogContextOid } from "../../src/logger";
import { identifyMockUser } from "../../src/user/userService";
import { config } from "../../src/config";

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
    expect(writeCommand.args[0].input.RequestItems[config.omistajaTableName].length).to.be.equal(6);
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(4);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(2);
    const snapshot: DBOmistaja[] = [];
    writeCommand.args[0].input.RequestItems[config.omistajaTableName].forEach((c, i) => {
      snapshot.push({ ...c.PutRequest?.Item, id: `${i}`, lisatty: "", expires: 0 } as DBOmistaja);
    });
    expect(snapshot).toMatchSnapshot();
  });
  it("poista kiinteistön omistaja", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock
      .on(GetCommand)
      .resolves({ Item: { id: "1", omistajat: ["1"], muutOmistajat: ["2"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    await poistaKiinteistonOmistaja({ oid: "1", omistaja: "1" });
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(0);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(1);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"][0]).to.be.equal("2");
    dbMock.reset();
    dbMock
      .on(GetCommand)
      .resolves({ Item: { id: "1", omistajat: ["11"], muutOmistajat: ["22"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    await poistaKiinteistonOmistaja({ oid: "1", omistaja: "22" });
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
    const updateCommand2 = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand2.args[0].input.ExpressionAttributeValues);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(1);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(0);
    expect(updateCommand2.args[0].input.ExpressionAttributeValues[":omistajat"][0]).to.be.equal("11");
  });
  it("päivitä kiinteistön omistajat", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1", omistajat: ["11"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    dbMock.on(GetCommand, { TableName: config.omistajaTableName, Key: { id: "11" } }).resolves({ Item: { id: "11", etunimet: "Teppo" } });
    await tallennaKiinteistonOmistajat({
      oid: "1",
      omistajat: [
        {
          id: "11",
          kiinteistotunnus: "1",
          jakeluosoite: "Osoite 2",
          postinumero: "00100",
          paikkakunta: "Helsinki",
        },
        {
          kiinteistotunnus: "2",
          id: "22",
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
    expect(o1.etunimet).to.be.equal("Teppo2");
    expect(o1.sukunimi).to.be.equal("Tepon sukunimi");
    expect(o1.jakeluosoite).to.be.equal("Osoite 2");
    expect(o1.postinumero).to.be.equal("00100");
    expect(o1.paikkakunta).to.be.equal("Helsinki");
    const putCommand2 = dbMock.commandCalls(PutCommand)[1];
    const o2 = putCommand2.args[0].input.Item as DBOmistaja;
    expect(o2.etunimet).to.be.equal("Matti");
    expect(o2.sukunimi).to.be.equal("Ruohonen");
    expect(o2.jakeluosoite).to.be.equal("Osoite 1");
    expect(o2.postinumero).to.be.equal("01000");
    expect(o2.paikkakunta).to.be.equal("Vantaa");
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(1);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajat"][0]).to.be.equal("11");
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(1);
  });
  it("hae kiinteistön omistajat", async () => {
    const dbMock = mockClient(DynamoDBDocumentClient);
    dbMock
      .on(GetCommand, { TableName: config.projektiTableName })
      .resolves({ Item: { id: "1", omistajat: ["1", "2", "3"], muutOmistajat: ["4"], kayttoOikeudet: [{ kayttajatunnus: "testuid" }] } });
    dbMock.on(BatchGetCommand).resolves({
      Responses: {
        [config.omistajaTableName]: [
          { id: "1", etunimet: "Matti", jakeluosoite: "Osoite 1", postinumero: "00100", paikkakunta: "Helsinki" },
          { id: "2", etunimet: "Teppo" },
        ],
      },
    });
    const omistajat = await haeKiinteistonOmistajat({ oid: "1", muutOmistajat: false, sivu: 1, sivuKoko: 2 });
    expect(dbMock.commandCalls(BatchGetCommand).length).to.be.equal(1);
    let batchCommand = dbMock.commandCalls(BatchGetCommand)[0];
    assert(batchCommand.args[0].input.RequestItems);
    let keys = batchCommand.args[0].input.RequestItems[config.omistajaTableName].Keys;
    assert(keys);
    expect(keys.length).to.be.equal(2);
    expect(keys[0].id).to.be.equal("1");
    expect(keys[1].id).to.be.equal("2");
    expect(omistajat.hakutulosMaara).to.be.equal(3);
    expect(omistajat.sivu).to.be.equal(1);
    expect(omistajat.sivunKoko).to.be.equal(2);
    expect(omistajat.omistajat[0]?.id).to.be.equal("1");
    expect(omistajat.omistajat[0]?.etunimet).to.be.equal("Matti");
    expect(omistajat.omistajat[0]?.jakeluosoite).to.be.equal("Osoite 1");
    expect(omistajat.omistajat[0]?.postinumero).to.be.equal("00100");
    expect(omistajat.omistajat[0]?.paikkakunta).to.be.equal("Helsinki");
    expect(omistajat.omistajat[1]?.id).to.be.equal("2");
    expect(omistajat.omistajat[1]?.etunimet).to.be.equal("Teppo");
    await haeKiinteistonOmistajat({ oid: "1", muutOmistajat: false, sivu: 2, sivuKoko: 2 });
    expect(dbMock.commandCalls(BatchGetCommand).length).to.be.equal(2);
    batchCommand = dbMock.commandCalls(BatchGetCommand)[1];
    assert(batchCommand.args[0].input.RequestItems);
    keys = batchCommand.args[0].input.RequestItems[config.omistajaTableName].Keys;
    assert(keys);
    expect(keys.length).to.be.equal(1);
    expect(keys[0].id).to.be.equal("3");
  });
});
