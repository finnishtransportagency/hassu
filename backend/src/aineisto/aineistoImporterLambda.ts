import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { velho } from "../velho/velhoClient";
import { fileService } from "../files/fileService";
import dayjs from "dayjs";
import { getAxios, setupLambdaMonitoring } from "../aws/monitoring";
import { ImportAineistoEvent } from "./importAineistoEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { findVuorovaikutusByNumber } from "../handler/projektiAdapter";
import { AineistoTila } from "../../../common/graphql/apiModel";
import * as AWSXRay from "aws-xray-sdk-core";

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return await AWSXRay.captureAsyncFunc("handler", async (subsegment) => {
    try {
      const axios = getAxios();
      for (const record of event.Records) {
        const aineistoEvent: ImportAineistoEvent = JSON.parse(record.body);
        log.info("ImportAineistoEvent", aineistoEvent);
        const { oid, vuorovaikutusNumero } = aineistoEvent;

        const projekti = await projektiDatabase.loadProjektiByOid(oid);
        if (!projekti) {
          throw new Error("Projektia " + oid + " ei löydy");
        }
        const vuorovaikutus = findVuorovaikutusByNumber(projekti, vuorovaikutusNumero);
        if (!vuorovaikutus) {
          throw new Error("Vuorovaikutusta " + vuorovaikutusNumero + " ei löydy projektista " + oid);
        }

        for (const aineisto of vuorovaikutus.aineistot) {
          const sourceURL = await velho.getLinkForDocument(aineisto.dokumenttiOid);
          const axiosResponse = await axios.get(sourceURL);
          const filePathInProjekti = "suunnitteluvaihe/vuorovaikutus_" + vuorovaikutus.vuorovaikutusNumero;
          const fileName = parseFilenameFromContentDisposition(axiosResponse.headers["content-disposition"]);
          aineisto.tiedosto = await fileService.createFileToProjekti({
            oid: projekti.oid,
            filePathInProjekti,
            fileName,
            contents: axiosResponse.data,
          });
          aineisto.tila = AineistoTila.VALMIS;
          aineisto.tuotu = dayjs().format();
        }

        await projektiDatabase.saveProjekti({
          oid: projekti.oid,
          vuorovaikutukset: [vuorovaikutus],
        });
      }
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
};

function parseFilenameFromContentDisposition(disposition?: string) {
  const utf8FilenameRegex = /filename\*=UTF-8''([\w%\-\\.]+)(?:; ?|$)/i;
  const asciiFilenameRegex = /filename=(["']?)(.*?[^\\])\1(?:; ?|$)/i;

  let fileName: string = null;
  if (utf8FilenameRegex.test(disposition)) {
    fileName = decodeURIComponent(utf8FilenameRegex.exec(disposition)[1]);
  } else {
    const matches = asciiFilenameRegex.exec(disposition);
    if (matches != null && matches[2]) {
      fileName = matches[2];
    }
  }
  return fileName;
}
