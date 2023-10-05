import { SendMessageRequest } from "@aws-sdk/client-sqs";
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { eventSqsClient } from "../../src/scheduler/eventSqsClient";
import { ScheduledEvent, ScheduledEventType } from "../../src/scheduler/scheduledEvent";
import { assertIsDefined } from "../../src/util/assertions";

const chai = require("chai");
const { expect } = chai;

describe("sqsEventHandlerLambda", () => {
  after(() => {
    sinon.restore();
  });

  function sendEventWithRetries(event: ScheduledEvent) {
    const sqsMessage: SendMessageRequest | undefined = eventSqsClient.createMessageParams(event, true);
    assertIsDefined(sqsMessage);
    expect(sqsMessage.DelaySeconds).to.eq(60);
    return JSON.parse(sqsMessage.MessageBody || "{}");
  }

  it("should produce params for retry successfully", async () => {
    let event: ScheduledEvent = { oid: "1", type: ScheduledEventType.SYNCHRONIZE };
    event = sendEventWithRetries(event);
    expect(event.retriesLeft).to.eq(60);
    event = sendEventWithRetries(event);
    expect(event.retriesLeft).to.eq(59);

    event.retriesLeft = 0;
    const sqsMessage = eventSqsClient.createMessageParams(event, true);
    expect(sqsMessage).to.be.undefined;
  });
});
