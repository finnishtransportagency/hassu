import { SQSEvent, SQSHandler } from "aws-lambda/trigger/sqs";
import { log } from "../logger";
import { velho } from "../velho/velhoClient";
import { fileService } from "../files/fileService";
import dayjs from "dayjs";
import { getAxios, setupLambdaMonitoring } from "../aws/monitoring";
import { ImportAineistoEvent, ImportAineistoEventType } from "./importAineistoEvent";
import { projektiDatabase } from "../database/projektiDatabase";
import { AineistoTila } from "../../../common/graphql/apiModel";
import * as AWSXRay from "aws-xray-sdk-core";
import { aineistoService } from "./aineistoService";
import {
  Aineisto,
  HyvaksymisVaihe,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  Vuorovaikutus
} from "../database/model";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import * as mime from "mime-types";

let axios;

async function handleVuorovaikutusAineisto(oid: string, vuorovaikutus: Vuorovaikutus): Promise<boolean> {
  const filePathInProjekti = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus).aineisto;
  const hasEsittelyAineistotChanges = await handleAineistot(oid, vuorovaikutus.esittelyaineistot, filePathInProjekti);
  const hasSuunnitelmaluonnoksetChanges = await handleAineistot(
    oid,
    vuorovaikutus.suunnitelmaluonnokset,
    filePathInProjekti
  );
  return hasEsittelyAineistotChanges || hasSuunnitelmaluonnoksetChanges;
}

async function handleNahtavillaoloVaiheAineistot(
  oid: string,
  nahtavillaoloVaihe: NahtavillaoloVaihe
): Promise<boolean> {
  const paths = new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaihe);
  let aineistoNahtavillaChanges;
  let lisaAineistoChanges;

  if (nahtavillaoloVaihe.aineistoNahtavilla) {
    aineistoNahtavillaChanges = await handleAineistot(oid, nahtavillaoloVaihe.aineistoNahtavilla, paths);
  }

  if (nahtavillaoloVaihe.lisaAineisto) {
    lisaAineistoChanges = await handleAineistot(oid, nahtavillaoloVaihe.lisaAineisto, paths);
  }
  return aineistoNahtavillaChanges || lisaAineistoChanges;
}

async function handleHyvaksymisVaiheAineistot(
  oid: string,
  hyvaksymisVaihe: HyvaksymisVaihe
): Promise<boolean> {
  let aineistoNahtavillaChanges;
  let hyvaksymisPaatosChanges;
  const hyvaksymisVaihePaths = new ProjektiPaths(oid).hyvaksymisVaihe(hyvaksymisVaihe);

  if (hyvaksymisVaihe.aineistoNahtavilla) {
    aineistoNahtavillaChanges = await handleAineistot(oid, hyvaksymisVaihe.aineistoNahtavilla, hyvaksymisVaihePaths);
  }

  if (hyvaksymisVaihe.hyvaksymisPaatos) {
    hyvaksymisPaatosChanges = await handleAineistot(oid, hyvaksymisVaihe.hyvaksymisPaatos, hyvaksymisVaihePaths.hyvaksymispaatos);
  }
  return hyvaksymisPaatosChanges || aineistoNahtavillaChanges;
}

async function handleAineistot(oid: string, aineistot: Aineisto[] | undefined, paths: PathTuple): Promise<boolean> {
  if (!aineistot) {
    return false;
  }
  let hasChanges = false;
  const originalAineistot = aineistot.splice(0, aineistot.length); // Move list contents to a separate list. Aineistot list contents are formed in the following loop
  for (const aineisto of originalAineistot) {
    if (aineisto.tila == AineistoTila.ODOTTAA_POISTOA) {
      await aineistoService.deleteAineisto(oid, aineisto, paths.yllapitoPath, paths.publicPath);
      hasChanges = true;
    } else if (aineisto.tila == AineistoTila.ODOTTAA_TUONTIA) {
      await importAineisto(aineisto, oid, paths.yllapitoPath);
      aineistot.push(aineisto);
      hasChanges = true;
    } else {
      aineistot.push(aineisto);
    }
  }

  return hasChanges;
}

async function importAineisto(aineisto: Aineisto, oid: string, filePathInProjekti: string) {
  const sourceURL = await velho.getLinkForDocument(aineisto.dokumenttiOid);
  const axiosResponse = await axios.get(sourceURL);
  const fileName = parseFilenameFromContentDisposition(axiosResponse.headers["content-disposition"]);
  const contentType = mime.lookup(fileName);
  aineisto.tiedosto = await fileService.createFileToProjekti({
    oid,
    filePathInProjekti,
    fileName,
    contentType: contentType || undefined,
    inline: true,
    contents: axiosResponse.data,
  });
  aineisto.tila = AineistoTila.VALMIS;
  aineisto.tuotu = dayjs().format();
}

async function handleVuorovaikutukset(oid: string, vuorovaikutukset: Vuorovaikutus[] | undefined) {
  for (const vuorovaikutus of vuorovaikutukset || []) {
    if (await handleVuorovaikutusAineisto(oid, vuorovaikutus)) {
      await projektiDatabase.saveProjekti({
        oid,
        vuorovaikutukset: [vuorovaikutus],
      });
    }

    if (vuorovaikutus.julkinen) {
      await aineistoService.synchronizeVuorovaikutusAineistoToPublic(oid, vuorovaikutus);
    }
  }
}

async function handleNahtavillaoloVaihe(
  oid: string,
  nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[],
  publishNahtavillaoloWithId: number
) {
  const nahtavillaoloVaiheJulkaisu = nahtavillaoloVaiheJulkaisut
    ?.filter((julkaisu) => julkaisu.id == publishNahtavillaoloWithId)
    .pop();
  if (nahtavillaoloVaiheJulkaisu) {
    await aineistoService.synchronizeNahtavillaoloVaiheJulkaisuAineistoToPublic(oid, nahtavillaoloVaiheJulkaisu);
  }
}

export const handleEvent: SQSHandler = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  return AWSXRay.captureAsyncFunc("handler", async (subsegment) => {
    try {
      axios = getAxios(); // Initialize Axios client here to get it properly instrumented by X-Ray

      for (const record of event.Records) {
        const aineistoEvent: ImportAineistoEvent = JSON.parse(record.body);
        log.info("ImportAineistoEvent", aineistoEvent);
        const { oid } = aineistoEvent;

        const projekti = await projektiDatabase.loadProjektiByOid(oid);
        if (!projekti) {
          throw new Error("Projektia " + oid + " ei löydy");
        }

        if (aineistoEvent.type == ImportAineistoEventType.IMPORT) {
          await handleVuorovaikutukset(oid, projekti.vuorovaikutukset);

          const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
          if (nahtavillaoloVaihe) {
            if (await handleNahtavillaoloVaiheAineistot(projekti.oid, nahtavillaoloVaihe)) {
              await projektiDatabase.saveProjekti({
                oid,
                nahtavillaoloVaihe,
              });
            }
          }
          const hyvaksymisVaihe = projekti.hyvaksymisVaihe;
          if (hyvaksymisVaihe) {
            if (await handleHyvaksymisVaiheAineistot(projekti.oid, hyvaksymisVaihe)) {
              await projektiDatabase.saveProjekti({
                oid,
                hyvaksymisVaihe,
              });
            }
          }
        } else if (
          aineistoEvent.type == ImportAineistoEventType.PUBLISH_NAHTAVILLAOLO &&
          aineistoEvent.publishNahtavillaoloWithId
        ) {
          await handleNahtavillaoloVaihe(
            oid,
            projekti.nahtavillaoloVaiheJulkaisut,
            aineistoEvent.publishNahtavillaoloWithId
          );
        }
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
