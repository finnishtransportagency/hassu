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
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  Vuorovaikutus,
} from "../database/model";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import * as mime from "mime-types";
import { AxiosStatic } from "axios";
import { findJulkaisuWithId } from "../projekti/projektiUtil";

let axios: AxiosStatic;

async function handleVuorovaikutusAineisto(oid: string, vuorovaikutus: Vuorovaikutus): Promise<boolean> {
  const filePathInProjekti = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus).aineisto;
  const hasEsittelyAineistotChanges = await handleAineistot(oid, vuorovaikutus.esittelyaineistot, filePathInProjekti);
  const hasSuunnitelmaluonnoksetChanges = await handleAineistot(oid, vuorovaikutus.suunnitelmaluonnokset, filePathInProjekti);
  return hasEsittelyAineistotChanges || hasSuunnitelmaluonnoksetChanges;
}

async function handleNahtavillaoloVaiheAineistot(
  oid: string,
  nahtavillaoloVaihe: NahtavillaoloVaihe | null | undefined
): Promise<NahtavillaoloVaihe | undefined> {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const paths = new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaihe);
  const aineistoNahtavillaChanges = await handleAineistot(oid, nahtavillaoloVaihe.aineistoNahtavilla, paths);
  const lisaAineistoChanges = await handleAineistot(oid, nahtavillaoloVaihe.lisaAineisto, paths);
  if (aineistoNahtavillaChanges || lisaAineistoChanges) {
    return nahtavillaoloVaihe;
  }
}

async function handleHyvaksymisPaatosVaiheAineistot(
  projekti: DBProjekti,
  fieldName: keyof Pick<DBProjekti, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">
): Promise<HyvaksymisPaatosVaihe | undefined> {
  const hyvaksymisPaatosVaihe = projekti[fieldName];
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  const oid = projekti.oid;
  const hyvaksymisPaatosVaihePaths = new ProjektiPaths(oid)[fieldName](hyvaksymisPaatosVaihe);
  const aineistoNahtavillaChanges = await handleAineistot(oid, hyvaksymisPaatosVaihe.aineistoNahtavilla, hyvaksymisPaatosVaihePaths);
  const hyvaksymisPaatosChanges = await handleAineistot(oid, hyvaksymisPaatosVaihe.hyvaksymisPaatos, hyvaksymisPaatosVaihePaths.paatos);
  if (hyvaksymisPaatosChanges || aineistoNahtavillaChanges) {
    return hyvaksymisPaatosVaihe;
  }
}

async function handleAineistot(oid: string, aineistot: Aineisto[] | null | undefined, paths: PathTuple): Promise<boolean> {
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
  const disposition: string = axiosResponse.headers["content-disposition"];
  const fileName = parseFilenameFromContentDisposition(disposition);
  if (!fileName) {
    throw new Error("Tiedoston nimeä ei pystytty päättelemään");
  }
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
  const nahtavillaoloVaiheJulkaisu = findJulkaisuWithId(nahtavillaoloVaiheJulkaisut, publishNahtavillaoloWithId);
  if (nahtavillaoloVaiheJulkaisu) {
    await aineistoService.synchronizeNahtavillaoloVaiheJulkaisuAineistoToPublic(oid, nahtavillaoloVaiheJulkaisu);
  }
}

async function handleHyvaksymisPaatosVaihe(oid: string, julkaisut: HyvaksymisPaatosVaiheJulkaisu[], publishJulkaisuWithId: number) {
  const julkaisu = findJulkaisuWithId(julkaisut, publishJulkaisuWithId);
  if (julkaisu) {
    await aineistoService.synchronizeHyvaksymisPaatosVaiheJulkaisuAineistoToPublic(
      oid,
      julkaisu,
      new ProjektiPaths(oid).hyvaksymisPaatosVaihe(julkaisu)
    );
  }
}

async function handleJatkoPaatos1Vaihe(oid: string, julkaisut: HyvaksymisPaatosVaiheJulkaisu[], publishJulkaisuWithId: number) {
  const julkaisu = findJulkaisuWithId(julkaisut, publishJulkaisuWithId);
  if (julkaisu) {
    await aineistoService.synchronizeHyvaksymisPaatosVaiheJulkaisuAineistoToPublic(
      oid,
      julkaisu,
      new ProjektiPaths(oid).jatkoPaatos1Vaihe(julkaisu)
    );
  }
}

async function handleJatkoPaatos2Vaihe(oid: string, julkaisut: HyvaksymisPaatosVaiheJulkaisu[], publishJulkaisuWithId: number) {
  const julkaisu = findJulkaisuWithId(julkaisut, publishJulkaisuWithId);
  if (julkaisu) {
    await aineistoService.synchronizeHyvaksymisPaatosVaiheJulkaisuAineistoToPublic(
      oid,
      julkaisu,
      new ProjektiPaths(oid).jatkoPaatos2Vaihe(julkaisu)
    );
  }
}

async function handleImport(projekti: DBProjekti) {
  const oid = projekti.oid;
  if (projekti.vuorovaikutukset) {
    await handleVuorovaikutukset(oid, projekti.vuorovaikutukset);
  }

  const nahtavillaoloVaihe = await handleNahtavillaoloVaiheAineistot(projekti.oid, projekti.nahtavillaoloVaihe);
  const hyvaksymisPaatosVaihe = await handleHyvaksymisPaatosVaiheAineistot(projekti, "hyvaksymisPaatosVaihe");
  const jatkoPaatos1Vaihe = await handleHyvaksymisPaatosVaiheAineistot(projekti, "jatkoPaatos1Vaihe");
  const jatkoPaatos2Vaihe = await handleHyvaksymisPaatosVaiheAineistot(projekti, "jatkoPaatos2Vaihe");

  await projektiDatabase.saveProjekti({
    oid,
    nahtavillaoloVaihe,
    hyvaksymisPaatosVaihe,
    jatkoPaatos1Vaihe,
    jatkoPaatos2Vaihe,
  });
}

async function handlePublish(aineistoEvent: ImportAineistoEvent, projekti: DBProjekti) {
  const oid = projekti.oid;
  if (
    aineistoEvent.type == ImportAineistoEventType.PUBLISH_NAHTAVILLAOLO &&
    aineistoEvent.publishNahtavillaoloWithId &&
    projekti.nahtavillaoloVaiheJulkaisut
  ) {
    await handleNahtavillaoloVaihe(oid, projekti.nahtavillaoloVaiheJulkaisut, aineistoEvent.publishNahtavillaoloWithId);
  } else if (
    aineistoEvent.type == ImportAineistoEventType.PUBLISH_HYVAKSYMISPAATOS &&
    aineistoEvent.publishHyvaksymisPaatosWithId &&
    projekti.hyvaksymisPaatosVaiheJulkaisut
  ) {
    await handleHyvaksymisPaatosVaihe(oid, projekti.hyvaksymisPaatosVaiheJulkaisut, aineistoEvent.publishHyvaksymisPaatosWithId);
  } else if (
    aineistoEvent.type == ImportAineistoEventType.PUBLISH_JATKOPAATOS1 &&
    aineistoEvent.publishJatkoPaatos1WithId &&
    projekti.jatkoPaatos1VaiheJulkaisut
  ) {
    await handleJatkoPaatos1Vaihe(oid, projekti.jatkoPaatos1VaiheJulkaisut, aineistoEvent.publishJatkoPaatos1WithId);
  } else if (
    aineistoEvent.type == ImportAineistoEventType.PUBLISH_JATKOPAATOS2 &&
    aineistoEvent.publishJatkoPaatos2WithId &&
    projekti.jatkoPaatos2VaiheJulkaisut
  ) {
    await handleJatkoPaatos2Vaihe(oid, projekti.jatkoPaatos2VaiheJulkaisut, aineistoEvent.publishJatkoPaatos2WithId);
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
          await handleImport(projekti);
        } else {
          await handlePublish(aineistoEvent, projekti);
        }
      }
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
};

function parseFilenameFromContentDisposition(disposition: string): string | null {
  const utf8FilenameRegex = /filename\*=UTF-8''([\w%\-\\.]+)(?:; ?|$)/i;
  const asciiFilenameRegex = /filename=(["']?)(.*?[^\\])\1(?:; ?|$)/i;

  let fileName: string | null = null;
  if (utf8FilenameRegex.test(disposition)) {
    const regexResult = utf8FilenameRegex.exec(disposition);
    if (regexResult) {
      fileName = decodeURIComponent(regexResult[1]);
    }
  } else {
    const matches = asciiFilenameRegex.exec(disposition);
    if (matches != null && matches[2]) {
      fileName = matches[2];
    }
  }
  return fileName;
}
