// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import * as sinon from "sinon";
import * as awsClient from "../../src/aws/client";
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
  let sendStub: sinon.SinonStub;

  beforeEach(() => {
    sendStub = sinon.stub();
    sinon.stub(awsClient, "getDynamoDBDocumentClient").returns({ send: sendStub } as never);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("put", () => {
    it("should send PutCommand with correct item", async () => {
      sendStub.resolves({});
      const item = createItem(1);
      await projektiEntityDatabase.put(item);
      expect(sendStub.calledOnce).to.be.true;
      expect(sendStub.firstCall.args[0].input.Item).to.deep.equal(item);
    });
  });

  describe("delete", () => {
    it("should send DeleteCommand with correct key", async () => {
      sendStub.resolves({});
      const item = createItem(1);
      await projektiEntityDatabase.delete(item);
      expect(sendStub.calledOnce).to.be.true;
      expect(sendStub.firstCall.args[0].input.Key).to.deep.equal({ projektiOid: "oid-1", sortKey: item.sortKey });
    });
  });

  describe("putAll", () => {
    it("should do nothing for empty array", async () => {
      await projektiEntityDatabase.putAll([]);
      expect(sendStub.called).to.be.false;
    });

    it("should do nothing for null", async () => {
      await projektiEntityDatabase.putAll(null);
      expect(sendStub.called).to.be.false;
    });

    it("should send single batch for <= 25 items", async () => {
      sendStub.resolves({});
      const items = Array.from({ length: 10 }, (_, i) => createItem(i + 1));
      await projektiEntityDatabase.putAll(items);
      expect(sendStub.calledOnce).to.be.true;
      const requestItems = sendStub.firstCall.args[0].input.RequestItems;
      const tableName = Object.keys(requestItems)[0];
      expect(requestItems[tableName]).to.have.lengthOf(10);
    });

    it("should chunk into multiple batches for > 25 items", async () => {
      sendStub.resolves({});
      const items = Array.from({ length: 30 }, (_, i) => createItem(i + 1));
      await projektiEntityDatabase.putAll(items);
      expect(sendStub.callCount).to.equal(2);
      const firstBatch = sendStub.firstCall.args[0].input.RequestItems;
      const secondBatch = sendStub.secondCall.args[0].input.RequestItems;
      const tableName = Object.keys(firstBatch)[0];
      expect(firstBatch[tableName]).to.have.lengthOf(25);
      expect(secondBatch[tableName]).to.have.lengthOf(5);
    });

    it("should retry UnprocessedItems", async () => {
      const item = createItem(1);
      const tableName = projektiEntityDatabase.tableName;
      sendStub
        .onFirstCall()
        .resolves({ UnprocessedItems: { [tableName]: [{ PutRequest: { Item: item } }] } })
        .onSecondCall()
        .resolves({});
      await projektiEntityDatabase.putAll([item]);
      expect(sendStub.callCount).to.equal(2);
    });
  });

  describe("deleteAll", () => {
    it("should do nothing for empty array", async () => {
      await projektiEntityDatabase.deleteAll([]);
      expect(sendStub.called).to.be.false;
    });

    it("should chunk into multiple batches for > 25 items", async () => {
      sendStub.resolves({});
      const items = Array.from({ length: 26 }, (_, i) => createItem(i + 1));
      await projektiEntityDatabase.deleteAll(items);
      expect(sendStub.callCount).to.equal(2);
      const firstBatch = sendStub.firstCall.args[0].input.RequestItems;
      const secondBatch = sendStub.secondCall.args[0].input.RequestItems;
      const tableName = Object.keys(firstBatch)[0];
      expect(firstBatch[tableName]).to.have.lengthOf(25);
      expect(secondBatch[tableName]).to.have.lengthOf(1);
    });
  });

  describe("getAllForProjekti", () => {
    it("should return items from query", async () => {
      const items = [createItem(1), createItem(2)];
      sendStub.resolves({ Items: items });
      const result = await projektiEntityDatabase.getAllForProjekti("oid-1", true);
      expect(result).to.deep.equal(items);
      expect(sendStub.firstCall.args[0].input.ConsistentRead).to.be.true;
    });

    it("should handle pagination", async () => {
      const item1 = createItem(1);
      const item2 = createItem(2);
      sendStub
        .onFirstCall()
        .resolves({ Items: [item1], LastEvaluatedKey: { projektiOid: "oid-1", sortKey: item1.sortKey } })
        .onSecondCall()
        .resolves({ Items: [item2] });
      const result = await projektiEntityDatabase.getAllForProjekti("oid-1", false);
      expect(result).to.deep.equal([item1, item2]);
      expect(sendStub.callCount).to.equal(2);
    });

    it("should return empty array when no items", async () => {
      sendStub.resolves({ Items: [] });
      const result = await projektiEntityDatabase.getAllForProjekti("oid-1", true);
      expect(result).to.deep.equal([]);
    });
  });
});
