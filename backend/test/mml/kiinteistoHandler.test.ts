import { SQSRecord } from "aws-lambda";
import { OmistajaHakuEvent, handleEvent, setClient } from "../../src/mml/kiinteistoHandler";
import { MmlClient } from "../../src/mml/mmlClient";
import { BatchWriteCommand, DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { assert, expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";

const mockMmlClient: MmlClient = {
  haeLainhuutotiedot: (_kiinteistotunnukset: string[]) => {
    return new Promise((resolve) => {
      resolve([
        {
          kiinteistotunnus: "1",
          omistajat: [
            {
              henkilotunnus: "111111-111A",
              etunimet: "Matti",
              sukunimi: "Testaaja",
              yhteystiedot: { jakeluosoite: "Katuosoite 1 A 100", postinumero: "00100", paikkakunta: "Helsinki" },
            },
            {
              henkilotunnus: "111111-113B",
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
              henkilotunnus: "222222-222A",
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

  it("tallenna kiinteistön omistajat", async () => {
    const event: OmistajaHakuEvent = { oid: "1", uid: "test", kiinteistotunnukset: ["1", "2", "3", "4"] };
    const record: SQSRecord = { body: JSON.stringify(event) } as unknown as SQSRecord;
    const dbMock = mockClient(DynamoDBDocumentClient);
    await handleEvent({ Records: [record] });
    dbMock.on(BatchWriteCommand).resolves({});
    expect(dbMock.commandCalls(BatchWriteCommand).length).to.be.equal(1);
    const writeCommand = dbMock.commandCalls(BatchWriteCommand)[0];
    assert(writeCommand.args[0].input.RequestItems);
    expect(writeCommand.args[0].input.RequestItems[process.env.TABLE_OMISTAJA!].length).to.be.equal(5);
    expect(dbMock.commandCalls(UpdateCommand).length).to.be.equal(1);
    const updateCommand = dbMock.commandCalls(UpdateCommand)[0];
    assert(updateCommand.args[0].input.ExpressionAttributeValues);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":omistajat"].length).to.be.equal(3);
    expect(updateCommand.args[0].input.ExpressionAttributeValues[":muutOmistajat"].length).to.be.equal(2);
    dbMock.reset();
  });
});
