import { SQSEvent, SQSHandler } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { log } from "../logger";
import projektiDatabase, { HyvaksymisEsityksenAineistotiedot } from "./dynamoKutsut";
import getHyvaksymisEsityksenAineistot from "./getAineistot";
import { parseDate } from "../util/dateUtil";
import { velho } from "../velho/velhoClient";
import putFile from "./s3Calls/putFile";
import { adaptFileName } from "../tiedostot/paths";

export enum HyvaksymisEsitysAineistoOperation {
  TUO_HYV_ES_TIEDOSTOT = "TUO_HYV_ES_AINEISTOT",
  ZIP_HYV_ES_AINEISTOT = "ZIP_HYV_ES_AINEISTOT",
}

export type SqsEvent = {
  oid: string;
  operation: HyvaksymisEsitysAineistoOperation;
  retriesLeft?: number;
  reason?: string;
  date?: string;
};

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return wrapXRayAsync("handler", async () => {
    try {
      for (const record of event.Records) {
        const sqsEvent: SqsEvent = JSON.parse(record.body);
        log.info("sqsEvent", sqsEvent);
        const { oid, operation } = sqsEvent;
        switch (operation) {
          case HyvaksymisEsitysAineistoOperation.ZIP_HYV_ES_AINEISTOT: {
            await tuoAineistot(oid);
          }
        }
      }
    } catch (e: unknown) {
      log.error(e);
      throw e;
    }
  });
};

async function tuoAineistot(oid: string) {
  const projekti: HyvaksymisEsityksenAineistotiedot = await projektiDatabase.haeHyvaksymisEsityksenAineistotiedot(oid);
  const { aineistoHandledAt } = projekti;
  // TODO: tarkista onko lockedUntil voimassa ja tee juttuja jos on
  const aineistot = getHyvaksymisEsityksenAineistot(projekti);

  // Etsi käsittelemättömät aineistot aikaleimojen perusteella
  const uudetAineistot = aineistot.filter(
    (aineisto) => !aineistoHandledAt || parseDate(aineisto.lisatty).isBefore(parseDate(aineistoHandledAt))
  );
  // Tuo aineistot
  await Promise.all(
    uudetAineistot.map(async (aineisto) => {
      const { contents } = await velho.getAineisto(aineisto.dokumenttiOid);
      await putFile({
        targetPath: `yllapito/tiedostot/projekti/${oid}/muokattava_hyvaksymisesitys/${aineisto.avain}/${adaptFileName(aineisto.nimi)}`,
        filename: aineisto.nimi,
        contents,
      });
    })
  );
  // TODO: aseta aineistoHandledAt-aikaleima tarkistaen, että versionumero on sama kuin alussa ja että lockedUntil ei ole päällä
}
