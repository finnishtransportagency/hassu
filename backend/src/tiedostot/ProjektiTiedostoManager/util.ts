import { AineistoTila, Kieli, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { Aineisto, KuulutusSaamePDFt, LadattuTiedosto } from "../../database/model";
import { PathTuple } from "../../files/ProjektiPath";
import { forEverySaameDo } from "../../projekti/adapter/common";
import { fileService } from "../../files/fileService";
import { velho } from "../../velho/velhoClient";
import * as mime from "mime-types";
import contentDisposition from "content-disposition";
import { FILE_PATH_DELETED_PREFIX } from "hassu-common/links";
import { nyt } from "../../util/dateUtil";
import { persistLadattuTiedosto } from "../../files/persistFiles";
import { translate } from "../../util/localization";
import { AineistoKategoria, aineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { omit } from "lodash";

export function getZipFolder(kategoriaId: string | undefined | null): string | undefined {
  if (!kategoriaId) {
    return undefined;
  }
  let path = "";
  let category: AineistoKategoria | undefined = aineistoKategoriat.findById(kategoriaId);
  while (category) {
    path = translate("aineisto-kategoria-nimi." + category.id, Kieli.SUOMI) + "/" + path;
    category = category.parentKategoria;
  }
  return path;
}

export function getKuulutusSaamePDFt(saamePDFt: KuulutusSaamePDFt | null | undefined): LadattuTiedosto[] {
  const tiedostot: LadattuTiedosto[] = [];
  if (saamePDFt) {
    forEverySaameDo((kieli) => {
      const pdft = saamePDFt[kieli];
      if (pdft?.kuulutusPDF) {
        tiedostot.push(pdft.kuulutusPDF);
      }
      if (pdft?.kuulutusIlmoitusPDF) {
        tiedostot.push(pdft.kuulutusIlmoitusPDF);
      }
    });
  }
  return tiedostot;
}

export async function handleAineistot(oid: string, aineistot: Aineisto[] | null | undefined, paths: PathTuple): Promise<boolean> {
  if (!aineistot) {
    return false;
  }
  let hasChanges = false;
  const originalAineistot = aineistot.splice(0, aineistot.length); // Move list contents to a separate list. Aineistot list contents are formed in the following loop
  for (const aineisto of originalAineistot) {
    if (aineisto.tila === AineistoTila.ODOTTAA_POISTOA) {
      await fileService.deleteAineisto(oid, omit(aineisto, "kategoriaMuuttunut"), paths.yllapitoPath, paths.publicPath, "ODOTTAA_POISTOA");
      hasChanges = true;
    } else if (aineisto.tila === AineistoTila.ODOTTAA_TUONTIA) {
      await importAineisto(aineisto, oid, paths);
      aineistot.push(omit(aineisto, "kategoriaMuuttunut"));
      hasChanges = true;
    } else if (aineisto.kategoriaMuuttunut) {
      aineistot.push(omit(aineisto, "kategoriaMuuttunut"));
      hasChanges = true;
    } else {
      aineistot.push(omit(aineisto, "kategoriaMuuttunut"));
    }
  }

  return hasChanges;
}

export async function handleTiedostot(oid: string, tiedostot: LadattuTiedosto[] | null | undefined, paths: PathTuple): Promise<boolean> {
  if (!tiedostot) {
    return false;
  }
  let hasChanges = false;
  const originalTiedostot = tiedostot.splice(0, tiedostot.length).sort((a, _b) => (a.tila == LadattuTiedostoTila.ODOTTAA_POISTOA ? -1 : 1)); // Move list contents to a separate list. Aineistot list contents are formed in the following loop
  for (const tiedosto of originalTiedostot) {
    const { fileWasRemoved, fileWasPersisted } = await persistLadattuTiedosto({
      oid,
      ladattuTiedosto: tiedosto,
      targetFilePathInProjekti: paths.yllapitoPath,
      poistetaan: tiedosto.tila === LadattuTiedostoTila.ODOTTAA_POISTOA,
    });
    if (!fileWasRemoved) {
      tiedostot.push(tiedosto);
    }
    if (fileWasRemoved || fileWasPersisted) {
      hasChanges = true;
    }
  }

  return hasChanges;
}

export async function importAineisto(aineisto: Aineisto, oid: string, path: PathTuple) {
  const { disposition, contents } = await velho.getAineisto(aineisto.dokumenttiOid);
  const fileName = contentDisposition.parse(disposition).parameters.filename;
  if (!fileName) {
    throw new Error("Tiedoston nimeä ei pystytty päättelemään: '" + disposition + "'");
  }
  const contentType = mime.lookup(fileName);
  aineisto.tiedosto = await fileService.createAineistoToProjekti({
    oid,
    path,
    fileName,
    contentType: contentType || undefined,
    inline: true,
    contents,
  });
  aineisto.tila = AineistoTila.VALMIS;
  aineisto.tuotu = nyt().format();
}

export function makeFilePathDeleted(filepath: string): string {
  if (!filepath.startsWith(FILE_PATH_DELETED_PREFIX)) {
    return FILE_PATH_DELETED_PREFIX + filepath;
  }
  return filepath;
}
