// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { mielipideDatabase } from "../../src/database/mielipideDatabase";

describe("mielipideDatabase", () => {
  let ddbMock: ReturnType<typeof mockClient>;

  beforeEach(() => {
    ddbMock = mockClient(DynamoDBDocumentClient);
  });

  afterEach(() => {
    ddbMock.restore();
  });

  describe("merkitseSaastuneeksi", () => {
    it("should send UpdateCommand with correct key and expression", async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await mielipideDatabase.merkitseSaastuneeksi("oid-123", "id-456");

      expect(ddbMock.commandCalls(UpdateCommand).length).to.equal(1);
      const input: UpdateCommandInput = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
      expect(input.Key).to.eql({ oid: "oid-123", id: "id-456" });
      expect(input.UpdateExpression).to.equal("SET liiteSaastunut = :true");
      expect(input.ExpressionAttributeValues).to.eql({ ":true": true });
    });
  });

  describe("haeMielipideMaara", () => {
    it("should send QueryCommand with FilterExpression that excludes saastuneet", async () => {
      ddbMock.on(QueryCommand).resolves({ Count: 3 });

      const result = await mielipideDatabase.haeMielipideMaara("oid-123");

      expect(result).to.equal(3);
      const input: QueryCommandInput = ddbMock.commandCalls(QueryCommand)[0].args[0].input;
      expect(input.KeyConditionExpression).to.equal("#oid = :oid");
      expect(input.FilterExpression).to.equal("attribute_not_exists(liiteSaastunut) OR liiteSaastunut = :false");
      expect(input.ExpressionAttributeValues).to.eql({ ":oid": "oid-123", ":false": false });
      expect(input.Select).to.equal("COUNT");
    });

    it("should return 0 when Count is undefined", async () => {
      ddbMock.on(QueryCommand).resolves({});

      const result = await mielipideDatabase.haeMielipideMaara("oid-123");

      expect(result).to.equal(0);
    });
  });
});
