import { AineistoTila, LadattuTiedostoTila, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { TiedostoManager, AineistoPathsPair, NahtavillaoloVaiheTiedostoManager, getZipFolder } from ".";
import { config } from "../../config";
import { LausuntoPyynto, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { fileService } from "../../files/fileService";
import { findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu } from "../../util/lausuntoPyyntoUtil";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyyntoTiedostoManager extends TiedostoManager<LausuntoPyynto[]> {
  private nahtavillaoloVaihe: NahtavillaoloVaihe | undefined;
  private nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[] | undefined;

  constructor(
    oid: string,
    vaihe: LausuntoPyynto[] | undefined | null,
    nahtavillaoloVaihe: NahtavillaoloVaihe | undefined | null,
    nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[] | undefined | null
  ) {
    super(oid, vaihe);
    this.nahtavillaoloVaihe = nahtavillaoloVaihe ?? undefined;
    this.nahtavillaoloVaiheJulkaisut = nahtavillaoloVaiheJulkaisut ?? undefined;
  }

  getLadatutTiedostot(vaihe: LausuntoPyynto[]): LadattuTiedostoPathsPair[] {
    return (
      vaihe.reduce((tiedostot, lausuntoPyynto) => {
        const paths = this.projektiPaths.lausuntoPyynto(lausuntoPyynto);
        tiedostot.push({ tiedostot: lausuntoPyynto.lisaAineistot, paths, category: "Lisäaineistot", uuid: lausuntoPyynto.uuid });
        return tiedostot;
      }, [] as LadattuTiedostoPathsPair[]) || []
    );
  }

  async handleChangedTiedostot(): Promise<LausuntoPyynto[] | undefined> {
    // Hoidetaan poistettavaksi merkittyjen lausuntopyyntöjen aineistojen ja aineistopaketin poistaminen.
    // Sen jälkeen filtteröidään ne pois paluuarvosta.
    // Tässä funktiossa palautettu lausuntopyyntöjen-array tallennetaan kutsuvassa funktiossa projektin lausuntopyynnöiksi,
    // eli poistetuksi merkityt lausuntopyyntöjen täydennykset tulevat poistetuksi.

    // Tyhjennetään this.vaihe, ja pushataan sinne takaisin ei-poistetut objektit
    const copyOfVaihe = this.vaihe?.splice(0, this.vaihe.length);
    let somethingRemoved = false;
    await copyOfVaihe?.reduce((promiseChain, lausuntoPyynto: LausuntoPyynto) => {
      return promiseChain.then(() => {
        if (lausuntoPyynto.poistetaan) {
          // Poista kaikki aineistot ja aineistopaketti kansiosta
          somethingRemoved = true;
          return fileService.deleteProjektiFilesRecursively(
            this.projektiPaths,
            ProjektiPaths.PATH_LAUSUNTOPYYNTO + "/" + lausuntoPyynto.uuid
          );
        } else {
          this.vaihe?.push(lausuntoPyynto);
        }
      });
    }, Promise.resolve());
    const otherChanges = await super.handleChangedTiedostot();
    return somethingRemoved ? this.vaihe : otherChanges;
  }

  getAineistot(): AineistoPathsPair[] {
    return [];
  }

  async createZipOfAineisto(
    zipFileS3Key: string,
    lausuntoPyyntoUuid: string,
    projektityyppi: ProjektiTyyppi | null | undefined
  ): Promise<LausuntoPyynto | undefined> {
    const lausuntoPyynto = this.vaihe?.find((lausuntoPyynto) => lausuntoPyynto.uuid === lausuntoPyyntoUuid);
    if (!lausuntoPyynto) {
      return;
    }
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu({
      nahtavillaoloVaihe: this.nahtavillaoloVaihe,
      nahtavillaoloVaiheJulkaisut: this.nahtavillaoloVaiheJulkaisut,
    });

    const nahtavillaoloAineistoPaths = nahtavillaolo
      ? new NahtavillaoloVaiheTiedostoManager(this.oid, this.nahtavillaoloVaihe, this.nahtavillaoloVaiheJulkaisut).getAineistot(
          nahtavillaolo
        )
      : [];
    const filesToZip: ZipSourceFile[] = [];
    const yllapitoPath = this.projektiPaths.yllapitoFullPath;

    nahtavillaoloAineistoPaths
      .flatMap((aineistot) => aineistot.aineisto ?? [])
      .filter((aineisto) => aineisto.tila === AineistoTila.VALMIS)
      .forEach((aineisto) => {
        const zipFolder = getZipFolder(aineisto.kategoriaId, projektityyppi);
        filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder });
      });

    const ladattuTiedostoPathsPairs = this.getLadatutTiedostot([lausuntoPyynto]).filter(
      (pathsPair) => pathsPair.uuid === lausuntoPyynto.uuid
    );
    for (const tiedostotArray of ladattuTiedostoPathsPairs) {
      if (tiedostotArray.tiedostot && tiedostotArray.paths) {
        for (const tiedosto of tiedostotArray.tiedostot) {
          if (tiedosto.tila === LadattuTiedostoTila.VALMIS) {
            const zipFolder = tiedostotArray.category ? tiedostotArray.category + "/" : undefined;
            filesToZip.push({ s3Key: this.projektiPaths.yllapitoFullPath + tiedosto.tiedosto, zipFolder });
          }
        }
      }
    }

    await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
  }
}
