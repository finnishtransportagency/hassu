import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { DBProjekti } from "../../src/database/model";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { assertIsDefined } from "../../src/util/assertions";

import { expect } from "chai";

describe("apiHandler", () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  afterEach(() => {
    ddbMock.reset();
    sinon.reset();
  });

  after(() => {
    ddbMock.restore();
  });

  describe("updateSuunnitelma", () => {
    let fixture: ProjektiFixture;

    beforeEach(() => {
      fixture = new ProjektiFixture();
    });

    describe("saveProjekti", () => {
      it("should pass expected parameters to DynamoDB", async () => {
        const updateMock = ddbMock.on(UpdateCommand).resolves({});

        await projektiDatabase.saveProjekti(fixture.dbProjekti1());

        expect(updateMock.calls().length).to.eq(1);
        const updateCommand: UpdateCommandInput = updateMock.calls()[0].firstArg.input;
        assertIsDefined(updateCommand?.ExpressionAttributeValues);
        updateCommand.ExpressionAttributeValues[":paivitetty"] = "2022-03-15T14:29:48.845Z";
        expect(updateCommand).toMatchSnapshot();
      });

      it("should remove null fields from DynamoDB", async () => {
        const updateMock = ddbMock.on(UpdateCommand).resolves({});

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const projekti: DBProjekti = {
          oid: fixture.PROJEKTI1_OID,
          versio: 1,
          muistiinpano: "foo",
          suunnitteluSopimus: null,
        } as DBProjekti;
        await projektiDatabase.saveProjekti(projekti);

        expect(updateMock.calls().length).to.eq(1);
        const updateCommand: UpdateCommandInput = updateMock.calls()[0].firstArg.input;
        assertIsDefined(updateCommand?.ExpressionAttributeValues);
        updateCommand.ExpressionAttributeValues[":paivitetty"] = "2022-03-15T14:29:48.845Z";
        expect(updateCommand).toMatchSnapshot();
      });

      it("should return items from listProjektit call", async () => {
        const scanMock = ddbMock.on(ScanCommand).resolves({
          Items: [
            { oid: 1, muistiinpano: "note 1" },
            { oid: 2, muistiinpano: "note 2" },
          ],
        });

        await projektiDatabase.findProjektiOidsWithNewFeedback();

        expect(scanMock.calls().length).to.eq(1);
        const scanCommand = scanMock.calls()[0].firstArg.input;
        expect(scanCommand).to.eql({
          TableName: "Projekti-localstack",
          IndexName: "UusiaPalautteitaIndex",
          Limit: 10,
          ExclusiveStartKey: undefined,
        });
      });
    });
  });
});
