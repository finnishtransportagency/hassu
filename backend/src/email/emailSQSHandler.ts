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
import { virusScanService } from "../files/virusScanService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { LiitteenSkannausTulos } from "hassu-common/graphql/apiModel";
import { config } from "../config";

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
          if (!projekti) {
            log.error("Projektia ei löydy");
            throw new NotFoundError("Projektia ei löydy");
          }
          const mielipide = await mielipideDatabase.haeMielipide(emailEvent.oid, emailEvent.mielipideId);
          if (!mielipide) {
            log.error("Mielipidettä ei löydy", { mielipideId: emailEvent.mielipideId });
            throw new NotFoundError("Mielipidettä ei löydy");
          }
          if (config.isPermanentEnvironment() && mielipide.liitteet?.length) {
            const projektiPaths = new ProjektiPaths(emailEvent.oid);
            const tulokset = await Promise.all(
              mielipide.liitteet.map((liite) => virusScanService.getVirusScanResult(projektiPaths, liite))
            );
            if (tulokset.some((tulos) => tulos === undefined)) {
              log.warn("Virusskannaus kesken liitteille, yritetään uudelleen..", { mielipideId: emailEvent.mielipideId });
              throw new Error("Virusskannaus kesken liitteille, yritetään uudelleen");
            }
            if (tulokset.some((tulos) => tulos === LiitteenSkannausTulos.SAASTUNUT)) {
              log.error(
                "Mielipiteen liitteessä havaittu virus. Sähköpostia kirjaamolle ei lähetetä ja viesti poistetaan jonosta. GuardDuty on siirtänyt saastuneen tiedoston karanteeniin ja lähettänyt hälytyksen.",
                { mielipideId: emailEvent.mielipideId }
              );
              return;
            }
          }
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
