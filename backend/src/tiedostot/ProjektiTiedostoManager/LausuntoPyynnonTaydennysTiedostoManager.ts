import { AineistoTila, Kieli, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { TiedostoManager, AineistoPathsPair } from ".";
import { config } from "../../config";
import { LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { fileService } from "../../files/fileService";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";
import { translate } from "../../util/localization";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyynnonTaydennyksetTiedostoManager extends TiedostoManager<LausuntoPyynnonTaydennys[]> {
  getAineistot(vaihe: LausuntoPyynnonTaydennys[]): AineistoPathsPair[] {
    return vaihe.reduce((aineistoPathsPairs, lausuntoPyynnonTaydennys) => {
      aineistoPathsPairs = aineistoPathsPairs.concat(this.getAineisto(lausuntoPyynnonTaydennys));
      return aineistoPathsPairs;
    }, [] as AineistoPathsPair[]);
  }

  private getAineisto(lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys): AineistoPathsPair[] {
    return [
      {
        paths: this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys),
        aineisto: lausuntoPyynnonTaydennys.muuAineisto,
      },
    ];
  }

  getLadatutTiedostot(vaihe: LausuntoPyynnonTaydennys[]): LadattuTiedostoPathsPair[] {
    return (
      vaihe.reduce((tiedostot, lausuntoPyynnonTaydennys) => {
        const paths = this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys);
        tiedostot.push({ tiedostot: lausuntoPyynnonTaydennys.muistutukset, paths });
        return tiedostot;
      }, [] as LadattuTiedostoPathsPair[]) || []
    );
  }

  async handleChanges(): Promise<LausuntoPyynnonTaydennys[] | undefined> {
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
    const otherChanges = super.handleChanges();
    return somethingRemoved ? this.vaihe : otherChanges;
  }

  async createZipOfAineisto(zipFileS3Key: string, lausuntoPyynnonTaydennysUuid: string): Promise<LausuntoPyynnonTaydennys | undefined> {
    const lausuntoPyynnonTaydennys = this.vaihe?.find(
      (lausuntoPyynnonTaydennys) => lausuntoPyynnonTaydennys.uuid === lausuntoPyynnonTaydennysUuid
    );

    if (!lausuntoPyynnonTaydennys) return;

    const aineistotPaths = this.getAineisto(lausuntoPyynnonTaydennys);
    const filesToZip: ZipSourceFile[] = [];
    const yllapitoPath = this.projektiPaths.yllapitoFullPath;
    for (const aineistot of aineistotPaths) {
      if (aineistot.aineisto) {
        for (const aineisto of aineistot.aineisto) {
          if (aineisto.tila === AineistoTila.VALMIS) {
            const category = aineisto.kategoriaId ? translate("aineisto-kategoria-nimi." + aineisto.kategoriaId, Kieli.SUOMI) + "/" : "";
            const folder = "muu_aineisto/" + category;
            filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder: folder });
          }
        }
      }
    }
    const muistutuksetArray: LadattuTiedosto[] = this.getLadatutTiedostot([lausuntoPyynnonTaydennys])[0].tiedostot || [];
    for (const muistutus of muistutuksetArray) {
      if (muistutus.tila === LadattuTiedostoTila.VALMIS) {
        filesToZip.push({ s3Key: yllapitoPath + muistutus.tiedosto, zipFolder: "muistutukset/" });
      }
    }
    await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
  }
}
