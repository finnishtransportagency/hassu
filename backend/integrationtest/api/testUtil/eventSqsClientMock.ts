import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import * as sinon from "sinon";
import { eventSqsClient } from "../../../src/sqsEvents/eventSqsClient";
import { handleEvent } from "../../../src/sqsEvents/sqsEventHandlerLambda";
import { Callback, Context } from "aws-lambda";
import mocha from "mocha";
import assert from "assert";
import { nyt, parseDate } from "../../../src/util/dateUtil";
import { SqsEvent } from "../../../src/sqsEvents/sqsEvent";

export class EventSqsClientMock {
  fakeEventQueue: SQSEvent[] = [];
  addEventToSqsQueueStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.addEventToSqsQueueStub = sinon.stub(eventSqsClient, "addEventToSqsQueue");
    });
    mocha.beforeEach(() => {
      this.addEventToSqsQueueStub.callsFake(async (event) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        this.fakeEventQueue.push({ Records: [{ body: JSON.stringify(event) } as SQSRecord] });
      });
    });
  }

  private timeToHandleEventIsNow(event: SqsEvent) {
    return !event.date || (event.date && parseDate(event.date).isBefore(nyt()));
  }

  async processQueue(): Promise<void> {
    let nothingToHandle = false;
    while (this.fakeEventQueue.length && !nothingToHandle) {
      const eventsToHandleNow: SQSEvent[] = this.fakeEventQueue.filter((event) => {
        assert(event.Records?.length);
        const firstEvent = event.Records[event.Records.length - 1];
        const parsedEvent: SqsEvent = JSON.parse(firstEvent.body);
        return this.timeToHandleEventIsNow(parsedEvent);
      });
      if (eventsToHandleNow.length == 0) {
        nothingToHandle = true;
      }
      for (const event of eventsToHandleNow) {
        await handleEvent(event, undefined as unknown as Context, undefined as unknown as Callback);
      }
      this.fakeEventQueue = this.fakeEventQueue.filter((event) => eventsToHandleNow.indexOf(event) == -1);
    }
  }
}
