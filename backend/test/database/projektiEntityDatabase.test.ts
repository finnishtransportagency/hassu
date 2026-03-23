// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import { mockClient } from "aws-sdk-client-mock";
import { BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { projektiEntityDatabase } from "../../src/database/projektiEntityDatabase";
import { HyvaksymisPaatosVaiheJulkaisu } from "../../src/database/model";
import { createJulkaisuSortKey } from "../../src/database/julkaisuItemKeys";

function createItem(id: number): HyvaksymisPaatosVaiheJulkaisu {
  const item = {
    projektiOid: "oid-1",
    sortKey: createJulkaisuSortKey("JULKAISU#HYVAKSYMISPAATOS#", id),
    id,
  };
  return item as HyvaksymisPaatosVaiheJulkaisu;
}

describe("projektiEntityDatabase", () => {
  // aws-sdk-client-mock@4.1.0 on rakennettu @smithy/types@1.x vastaan, mutta projekti käyttää @smithy/types@4.x.
  // Tämä aiheuttaa tyyppien yhteensopimattomuuden. `as any` -castit voi poistaa kun aws-sdk-client-mock päivittyy.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ddbMock = mockClient(DynamoDBDocumentClient as any);

  afterEach(() => {
    ddbMock.reset();
  });

  after(() => {
    ddbMock.restore();
  });

  describe("put", () => {
    it("should send PutCommand with correct item", async () => {
      ddbMock.on(PutCommand as any).resolves({});
      const item = createItem(1);
      await projektiEntityDatabase.put(item);
      const calls = ddbMock.commandCalls(PutCommand as any);
      expect(calls).to.have.lengthOf(1);
      expect(calls[0].args[0].input.Item).to.deep.equal(item);
    });
  });

  describe("delete", () => {
    it("should send DeleteCommand with correct key", async () => {
      ddbMock.on(DeleteCommand as any).resolves({});
      const item = createItem(1);
      await projektiEntityDatabase.delete(item);
      const calls = ddbMock.commandCalls(DeleteCommand as any);
      expect(calls).to.have.lengthOf(1);
      expect(calls[0].args[0].input.Key).to.deep.equal({ projektiOid: "oid-1", sortKey: item.sortKey });
    });
  });

  describe("putAll", () => {
    it("should do nothing for empty array", async () => {
      await projektiEntityDatabase.putAll([]);
      expect(ddbMock.commandCalls(BatchWriteCommand as any)).to.have.lengthOf(0);
    });

    it("should do nothing for null", async () => {
      await projektiEntityDatabase.putAll(null);
      expect(ddbMock.commandCalls(BatchWriteCommand as any)).to.have.lengthOf(0);
    });

    it("should send single batch for <= 25 items", async () => {
      ddbMock.on(BatchWriteCommand as any).resolves({});
      const items = Array.from({ length: 10 }, (_, i) => createItem(i + 1));
      await projektiEntityDatabase.putAll(items);
      const calls = ddbMock.commandCalls(BatchWriteCommand as any);
      expect(calls).to.have.lengthOf(1);
      const requestItems = calls[0].args[0].input.RequestItems;
      const tableName = Object.keys(requestItems)[0];
      expect(requestItems[tableName]).to.have.lengthOf(10);
    });

    it("should chunk into multiple batches for > 25 items", async () => {
      ddbMock.on(BatchWriteCommand as any).resolves({});
      const items = Array.from({ length: 30 }, (_, i) => createItem(i + 1));
      await projektiEntityDatabase.putAll(items);
      const calls = ddbMock.commandCalls(BatchWriteCommand as any);
      expect(calls).to.have.lengthOf(2);
      const tableName = Object.keys(calls[0].args[0].input.RequestItems)[0];
      expect(calls[0].args[0].input.RequestItems[tableName]).to.have.lengthOf(25);
      expect(calls[1].args[0].input.RequestItems[tableName]).to.have.lengthOf(5);
    });

    it("should retry UnprocessedItems", async () => {
      const item = createItem(1);
      const tableName = projektiEntityDatabase.tableName;
      ddbMock
        .on(BatchWriteCommand as any)
        .resolvesOnce({ UnprocessedItems: { [tableName]: [{ PutRequest: { Item: item } }] } } as any)
        .resolvesOnce({});
      await projektiEntityDatabase.putAll([item]);
      expect(ddbMock.commandCalls(BatchWriteCommand as any)).to.have.lengthOf(2);
    });
  });

  describe("deleteAll", () => {
    it("should do nothing for empty array", async () => {
      await projektiEntityDatabase.deleteAll([]);
      expect(ddbMock.commandCalls(BatchWriteCommand as any)).to.have.lengthOf(0);
    });

    it("should chunk into multiple batches for > 25 items", async () => {
      ddbMock.on(BatchWriteCommand as any).resolves({});
      const items = Array.from({ length: 26 }, (_, i) => createItem(i + 1));
      await projektiEntityDatabase.deleteAll(items);
      const calls = ddbMock.commandCalls(BatchWriteCommand as any);
      expect(calls).to.have.lengthOf(2);
      const tableName = Object.keys(calls[0].args[0].input.RequestItems)[0];
      expect(calls[0].args[0].input.RequestItems[tableName]).to.have.lengthOf(25);
      expect(calls[1].args[0].input.RequestItems[tableName]).to.have.lengthOf(1);
    });
  });

  describe("getAllForProjekti", () => {
    it("should return items from query", async () => {
      const items = [createItem(1), createItem(2)];
      ddbMock.on(QueryCommand as any).resolves({ Items: items } as any);
      const result = await projektiEntityDatabase.getAllForProjekti("oid-1", true);
      expect(result).to.deep.equal(items);
      const calls = ddbMock.commandCalls(QueryCommand as any);
      expect(calls[0].args[0].input.ConsistentRead).to.be.true;
    });

    it("should handle pagination", async () => {
      const item1 = createItem(1);
      const item2 = createItem(2);
      ddbMock
        .on(QueryCommand as any)
        .resolvesOnce({ Items: [item1], LastEvaluatedKey: { projektiOid: "oid-1", sortKey: item1.sortKey } } as any)
        .resolvesOnce({ Items: [item2] } as any);
      const result = await projektiEntityDatabase.getAllForProjekti("oid-1", false);
      expect(result).to.deep.equal([item1, item2]);
      expect(ddbMock.commandCalls(QueryCommand as any)).to.have.lengthOf(2);
    });

    it("should return empty array when no items", async () => {
      ddbMock.on(QueryCommand as any).resolves({ Items: [] } as any);
      const result = await projektiEntityDatabase.getAllForProjekti("oid-1", true);
      expect(result).to.deep.equal([]);
    });
  });
});
