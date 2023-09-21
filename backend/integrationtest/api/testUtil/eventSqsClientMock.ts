import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import * as sinon from "sinon";
import { eventSqsClient } from "../../../src/scheduler/eventSqsClient";
import { handleEvent } from "../../../src/scheduler/sqsEventHandlerLambda";
import { Callback, Context } from "aws-lambda";
import mocha from "mocha";

export class EventSqsClientMock {
  fakeEventQueue: SQSEvent[] = [];
  sendScheduledEventStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.sendScheduledEventStub = sinon.stub(eventSqsClient, "sendScheduledEvent");
    });
    mocha.beforeEach(() => {
      this.sendScheduledEventStub.callsFake(async (event) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        this.fakeEventQueue.push({ Records: [{ body: JSON.stringify(event) } as SQSRecord] });
      });
    });
  }

  async processQueue(): Promise<void> {
    for (const event of this.fakeEventQueue) {
      await handleEvent(event, undefined as unknown as Context, undefined as unknown as Callback);
    }
    this.fakeEventQueue.splice(0, this.fakeEventQueue.length); // Clear the queue
  }
}
