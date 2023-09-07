import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { palauteEmailService } from "../palaute/palauteEmailService";
import { log } from "../logger";
import { EmailEvent, EmailEventType } from "./model/emailEvent";

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return await wrapXRayAsync("handler", async () => {
    try {
      for (const record of event.Records) {
        const emailEvent: EmailEvent = JSON.parse(record.body);
        log.info("Event", { emailEvent });
        if (emailEvent.type === EmailEventType.UUDET_PALAUTTEET_DIGEST) {
          await palauteEmailService.sendNewFeedbackDigest();
        } else {
          throw new Error("Unknown event type");
        }
      }
    } catch (e: unknown) {
      log.error(e);
      throw e;
    }
  });
};
