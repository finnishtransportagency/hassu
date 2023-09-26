import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import * as sinon from "sinon";
import { eventSqsClient } from "../../../src/scheduler/eventSqsClient";
import { handleEvent } from "../../../src/scheduler/sqsEventHandlerLambda";
import { Callback, Context } from "aws-lambda";
import mocha from "mocha";
import assert from "assert";
import { ScheduledEvent } from "../../../src/scheduler/scheduledEvent";
import dayjs from "dayjs";
import { nyt } from "../../../src/util/dateUtil";

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
    const deletedIndexes: number[] = [];
    await Promise.all(
      this.fakeEventQueue.map(async (event, index) => {
        assert(event.Records && event.Records.length);
        const firstEvent = event.Records[event.Records.length - 1];
        const parsedFirstEvent: ScheduledEvent = JSON.parse(firstEvent.body);
        if (!parsedFirstEvent.date || (parsedFirstEvent.date && dayjs(parsedFirstEvent.date).isBefore(nyt()))) {
          await handleEvent(event, undefined as unknown as Context, undefined as unknown as Callback);
          deletedIndexes.push(index);
        }
      })
    );
    this.fakeEventQueue = this.fakeEventQueue.filter((_event, index) => !deletedIndexes.includes(index));
  }
}
