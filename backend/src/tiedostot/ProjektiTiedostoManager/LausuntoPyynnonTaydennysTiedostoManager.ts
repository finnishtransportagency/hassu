import { LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { TiedostoManager, AineistoPathsPair } from ".";
import { config } from "../../config";
import { LausuntoPyynnonTaydennys } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { fileService } from "../../files/fileService";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyynnonTaydennyksetTiedostoManager extends TiedostoManager<LausuntoPyynnonTaydennys[]> {
  getAineistot(vaihe: LausuntoPyynnonTaydennys[]): AineistoPathsPair[] {
    return vaihe.reduce((aineistoPathsPairs, lausuntoPyynnonTaydennys) => {
      aineistoPathsPairs = aineistoPathsPairs.concat(this.getAineisto(lausuntoPyynnonTaydennys));
      return aineistoPathsPairs;
    }, [] as AineistoPathsPair[]);
  }

  private getAineisto(_lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys): AineistoPathsPair[] {
    return [];
  }

  getLadatutTiedostot(vaihe: LausuntoPyynnonTaydennys[]): LadattuTiedostoPathsPair[] {
    return (
      vaihe.reduce((tiedostot, lausuntoPyynnonTaydennys) => {
        const paths = this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys);
        tiedostot.push({
          tiedostot: lausuntoPyynnonTaydennys.muistutukset,
          paths,
          category: "Muistutukset",
          uuid: lausuntoPyynnonTaydennys.uuid,
        });
        tiedostot.push({
          tiedostot: lausuntoPyynnonTaydennys.muuAineisto,
          paths,
          category: "Muu aineisto",
          uuid: lausuntoPyynnonTaydennys.uuid,
        });
        return tiedostot;
      }, [] as LadattuTiedostoPathsPair[]) || []
    );
  }

  async handleChangedTiedostot(): Promise<LausuntoPyynnonTaydennys[] | undefined> {
    // Hoidetaan poistettavaksi merkittyjen lausuntopyyntöjen täydennysten aineistojen ja aineistopaketin poistaminen.
    // Sen jälkeen filtteröidään ne pois paluuarvosta.
    // Tässä funktiossa palautettu lausuntopyyntöjen täydennykset -array tallennetaan kutsuvassa funktiossa projektin lausuntopyyntöjen täydennyksiksi,
    // eli poistetuksi merkityt lausuntopyyntöjen täydennykset tulevat poistetuksi.

    // Tyhjennetään this.vaihe, ja pushataan sinne takaisin ei-poistetut objektit
    const copyOfVaihe = this.vaihe?.splice(0, this.vaihe.length);
    let somethingRemoved = false;
    await copyOfVaihe?.reduce((promiseChain, lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) => {
      return promiseChain.then(() => {
        if (lausuntoPyynnonTaydennys.poistetaan) {
          // Poista kaikki aineistot ja aineistopaketti kansiosta
          somethingRemoved = true;
          return fileService.deleteProjektiFilesRecursively(
            this.projektiPaths,
            ProjektiPaths.PATH_LAUSUNTOPYYNNON_TAYDENNYS + "/" + lausuntoPyynnonTaydennys.uuid
          );
        } else {
          this.vaihe?.push(lausuntoPyynnonTaydennys);
        }
      });
    }, Promise.resolve());
    const otherChanges = await super.handleChangedTiedostot();
    return somethingRemoved ? this.vaihe : otherChanges;
  }

  async createZipOfAineisto(zipFileS3Key: string, lausuntoPyynnonTaydennysUuid: string): Promise<LausuntoPyynnonTaydennys | undefined> {
    const lausuntoPyynnonTaydennys = this.vaihe?.find(
      (lausuntoPyynnonTaydennys) => lausuntoPyynnonTaydennys.uuid === lausuntoPyynnonTaydennysUuid
    );

    if (!lausuntoPyynnonTaydennys) return;

    const filesToZip: ZipSourceFile[] = [];
    const ladattuTiedostoPathsPairs = this.getLadatutTiedostot([lausuntoPyynnonTaydennys]).filter(
      (pathsPair) => pathsPair.uuid === lausuntoPyynnonTaydennys.uuid
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
