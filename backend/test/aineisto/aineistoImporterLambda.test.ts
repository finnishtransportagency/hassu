import { SendMessageRequest } from "@aws-sdk/client-sqs";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { aineistoImporterClient } from "../../src/aineisto/aineistoImporterClient";
import { ImportAineistoEvent, ImportAineistoEventType } from "../../src/aineisto/importAineistoEvent";
import { assertIsDefined } from "../../src/util/assertions";

const chai = require("chai");
const { expect } = chai;

describe("aineistoImporterLambda", () => {
  after(() => {
    sinon.restore();
  });

  function sendEventWithRetries(event: ImportAineistoEvent) {
    const sqsMessage: SendMessageRequest | undefined = aineistoImporterClient.createMessageParams(event, true);
    assertIsDefined(sqsMessage);
    expect(sqsMessage.DelaySeconds).to.eq(60);
    return JSON.parse(sqsMessage.MessageBody || "{}");
  }

  it("should produce params for retry successfully", async () => {
    let event: ImportAineistoEvent = { oid: "1", type: ImportAineistoEventType.SYNCHRONIZE };
    event = sendEventWithRetries(event);
    expect(event.retriesLeft).to.eq(60);
    event = sendEventWithRetries(event);
    expect(event.retriesLeft).to.eq(59);

    event.retriesLeft = 0;
    const sqsMessage = aineistoImporterClient.createMessageParams(event, true);
    expect(sqsMessage).to.be.undefined;
  });
});
