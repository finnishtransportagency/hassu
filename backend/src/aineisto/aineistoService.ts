import { Aineisto, Vuorovaikutus } from "../database/model/suunnitteluVaihe";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { fileService } from "../files/fileService";
import { parseDate } from "../util/dateUtil";
import { AineistoTila } from "../../../common/graphql/apiModel";

class AineistoService {
  async importAineisto(oid: string, vuorovaikutusNumero: number) {
    // Import files from Velho
    await aineistoImporterClient.importAineisto({
      oid,
      vuorovaikutusNumero,
    });
  }

  /**
   * Copy aineisto to public S3 with proper publish and expiration dates
   * @param vuorovaikutus
   */
  async publishVuorovaikutusAineisto(oid: string, vuorovaikutus: Vuorovaikutus): Promise<void> {
    const publishDate = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
    const expirationDate = parseDate(vuorovaikutus.aineistoPoistetaanNakyvista);
    if (!vuorovaikutus.aineistot) {
      return;
    }
    for (const aineisto of vuorovaikutus.aineistot) {
      if (aineisto.tila == AineistoTila.VALMIS) {
        await fileService.publishProjektiFile(oid, aineisto.tiedosto, publishDate, expirationDate);
      }
    }
  }

  async deleteAineisto(oid: string, aineistotToDelete: Aineisto[]) {
    for (const aineisto of aineistotToDelete) {
      log.info("Poistetaan aineisto", aineisto);
      await fileService.deleteFileFromProjekti({
        oid,
        fullFilePathInProjekti: aineisto.tiedosto,
      });
    }
  }
}

export const aineistoService = new AineistoService();
