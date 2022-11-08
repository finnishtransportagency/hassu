import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { EmailEvent, EmailEventType } from "./emailEvent";
import { palauteEmailService } from "../palaute/palauteEmailService";
import { log } from "../logger";

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return await wrapXRayAsync("handler", async (subsegment) => {
    for (const record of event.Records) {
      const emailEvent: EmailEvent = JSON.parse(record.body);
      log.info("Event", { emailEvent });
      switch (emailEvent.type) {
        case EmailEventType.UUDET_PALAUTTEET_DIGEST:
          await palauteEmailService.sendNewFeedbackDigest();
          break;
        default:
          throw new Error("Unknown event type");
      }
    }
  });
};
