import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import * as sinon from "sinon";
import { eventSqsClient } from "../../../src/aineisto/eventSqsClient";
import { handleEvent } from "../../../src/aineisto/sqsEventHandlerLambda";
import { Callback, Context } from "aws-lambda";
import mocha from "mocha";

export class ImportAineistoMock {
  fakeAineistoImportQueue: SQSEvent[] = [];
  importAineistoStub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      this.importAineistoStub = sinon.stub(eventSqsClient, "sendScheduledEvent");
    });
    mocha.beforeEach(() => {
      this.importAineistoStub.callsFake(async (event) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        this.fakeAineistoImportQueue.push({ Records: [{ body: JSON.stringify(event) } as SQSRecord] });
      });
    });
  }

  async processQueue(): Promise<void> {
    for (const event of this.fakeAineistoImportQueue) {
      await handleEvent(event, undefined as unknown as Context, undefined as unknown as Callback);
    }
    this.fakeAineistoImportQueue.splice(0, this.fakeAineistoImportQueue.length); // Clear the queue
  }
}
