// Contains code generated or recommended by Amazon Q
import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { palauteEmailService } from "../palaute/palauteEmailService";
import { log } from "../logger";
import { EmailEvent, EmailEventType } from "./model/emailEvent";
import { mielipideEmailService } from "../mielipide/mielipideEmailService";
import { projektiDatabase } from "../database/projektiDatabase";
import { mielipideDatabase } from "../database/mielipideDatabase";
import { NotFoundError } from "hassu-common/error";

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return await wrapXRayAsync("handler", async () => {
    try {
      for (const record of event.Records) {
        const emailEvent: EmailEvent = JSON.parse(record.body);
        log.info("Event", { emailEvent });
        if (emailEvent.type === EmailEventType.UUDET_PALAUTTEET_DIGEST) {
          await palauteEmailService.sendNewFeedbackDigest();
        } else if (emailEvent.type === EmailEventType.MIELIPIDE_KIRJAAMO) {
          const projekti = await projektiDatabase.loadProjektiByOid(emailEvent.oid);
          if (!projekti) throw new NotFoundError("Projektia ei löydy: " + emailEvent.oid);
          const mielipide = await mielipideDatabase.haeMielipide(emailEvent.oid, emailEvent.mielipideId);
          if (!mielipide) throw new NotFoundError("Mielipidettä ei löydy: " + emailEvent.mielipideId);
          await mielipideEmailService.sendEmailToKirjaamo(projekti, mielipide);
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
