import { AineistoTila, Kieli, LadattuTiedostoTila, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { Aineisto, KuulutusSaamePDFt, TiedotettavaKuulutusSaamePDFt, LadattuTiedosto } from "../../database/model";
import { PathTuple } from "../../files/ProjektiPath";
import { forEverySaameDo } from "../../projekti/adapter/common";
import { fileService } from "../../files/fileService";
import { velho } from "../../velho/velhoClient";
import * as mime from "mime-types";
import contentDisposition from "content-disposition";
import { FILE_PATH_DELETED_PREFIX } from "hassu-common/links";
import { nyt } from "../../util/dateUtil";
import { deleteFile, persistLadattuTiedosto } from "../../files/persistFiles";
import { translate } from "../../util/localization";
import { AineistoKategoria, getAineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { omit } from "lodash";

export function getZipFolder(
  kategoriaId: string | undefined | null,
  projektiTyyppi: ProjektiTyyppi | null | undefined
): string | undefined {
  if (!kategoriaId) {
    return undefined;
  }
  let path = "";
  let category: AineistoKategoria | undefined = getAineistoKategoriat({ projektiTyyppi }).findById(kategoriaId);
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

export function getTiedotettavaKuulutusSaamePDFt(saamePDFt: TiedotettavaKuulutusSaamePDFt | null | undefined): LadattuTiedosto[] {
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
      if (pdft?.kirjeTiedotettavillePDF) {
        tiedostot.push(pdft.kirjeTiedotettavillePDF);
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
  // Move list contents to a separate list. Aineistot list contents are formed in the following loop
  const poistettavat: Aineisto[] = [];
  const persistoitavat: Aineisto[] = [];
  const originalAineistot = aineistot.splice(0, aineistot.length);
  for (const aineisto of originalAineistot) {
    if (aineisto.tila === AineistoTila.ODOTTAA_POISTOA) {
      poistettavat.push(aineisto);
      hasChanges = true;
    } else if (aineisto.tila === AineistoTila.ODOTTAA_TUONTIA) {
      const persistoitava = omit(aineisto, "kategoriaMuuttunut");
      persistoitavat.push(persistoitava);
      aineistot.push(persistoitava);
      hasChanges = true;
    } else if (aineisto.kategoriaMuuttunut) {
      aineistot.push(omit(aineisto, "kategoriaMuuttunut"));
      hasChanges = true;
    } else {
      aineistot.push(omit(aineisto, "kategoriaMuuttunut"));
    }
  }
  for (const aineisto of poistettavat) {
    await fileService.deleteAineisto(oid, omit(aineisto, "kategoriaMuuttunut"), paths.yllapitoPath, paths.publicPath, "ODOTTAA_POISTOA");
  }
  for (const aineisto of persistoitavat) {
    await importAineisto(aineisto, oid, paths);
  }

  return hasChanges;
}

export async function handleTiedostot(oid: string, tiedostot: LadattuTiedosto[] | null | undefined, paths: PathTuple): Promise<boolean> {
  if (!tiedostot) {
    return false;
  }
  // parametrina annetut 'tiedostot' tyhjennetään, ja uudet arvot pushataan tilalle
  const { poistettavat, valmiit, persistoitavat } = tiedostot.splice(0, tiedostot.length).reduce(
    ({ poistettavat, valmiit, persistoitavat }, tiedosto) => {
      switch (tiedosto.tila) {
        case LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA:
          persistoitavat.push(tiedosto);
          break;
        case LadattuTiedostoTila.ODOTTAA_POISTOA:
          poistettavat.push(tiedosto);
          break;
        default:
          valmiit.push(tiedosto);
          break;
      }
      return { poistettavat, valmiit, persistoitavat };
    },
    { poistettavat: [], valmiit: [], persistoitavat: [] } as {
      poistettavat: LadattuTiedosto[];
      valmiit: LadattuTiedosto[];
      persistoitavat: LadattuTiedosto[];
    }
  );
  await Promise.all(poistettavat.map((tiedosto) => deleteFile({ oid, tiedosto })));
  // ignoorataan virheelliset latausviittaukset jotta ei aiheuta projektin lukitusta 4 päiväksi kun sanoman käsittely ei onnistu
  const persistoidutTiedostot = (
    await Promise.all(
      persistoitavat.map((tiedosto) =>
        persistLadattuTiedosto({
          oid,
          ladattuTiedosto: tiedosto,
          targetFilePathInProjekti: paths.yllapitoPath,
        })
      )
    )
  ).filter((t): t is LadattuTiedosto => t !== undefined);
  tiedostot.push(...valmiit.concat(persistoidutTiedostot).sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0)));
  if (poistettavat.length || persistoitavat.length) {
    return true;
  } else {
    return false;
  }
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
