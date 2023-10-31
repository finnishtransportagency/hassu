import { AineistoManager, AineistoPathsPair } from ".";
import { config } from "../../config";
import { LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { fileService } from "../../files/fileService";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";

export class LausuntoPyynnonTaydennyksetAineisto extends AineistoManager<LausuntoPyynnonTaydennys[]> {
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
      {
        paths: this.projektiPaths.lausuntoPyynnonTaydennys(lausuntoPyynnonTaydennys),
        aineisto: lausuntoPyynnonTaydennys.muistutukset,
      },
    ];
  }

  getLadatutTiedostot(_vaihe: LausuntoPyynnonTaydennys[]): LadattuTiedosto[] {
    return []; //Lausuntopyynnön täydennyksiin ei liity muista tiedostoja kuin muut aineistot
  }

  async handleChanges(): Promise<LausuntoPyynnonTaydennys[] | undefined> {
    const vaihe = await super.handleChanges();
    // Hoidetaan poistettavaksi merkittyjen lausuntopyyntöjen täydennysten aineistojen ja aineistopaketin poistaminen.
    // Sen jälkeen filtteröidään ne pois paluuarvosta.
    // Tässä funktiossa palautettu lausuntopyyntöjen täydennykset -array tallennetaan kutsuvassa funktiossa projektin lausuntopyyntöjen täydennyksiksi,
    // eli poistetuksi merkityt lausuntopyyntöjen täydennykset tulevat poistetuksi.
    return vaihe?.filter((lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) => {
      if (lausuntoPyynnonTaydennys.poistetaan) {
        // Poista kaikki aineistot ja aineistopaketti kansiosta
        fileService.deleteProjektiFilesRecursively(
          this.projektiPaths,
          ProjektiPaths.PATH_LAUSUNTOPYYNNON_TAYDENNYS + "/" + lausuntoPyynnonTaydennys.kunta
        );
        return false;
      } else {
        return true;
      }
    });
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
      if (!aineistot.aineisto) return;
      for (const aineisto of aineistot.aineisto) {
        const folder = aineisto.kategoriaId + "/";
        filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder: aineisto.kategoriaId ? folder : undefined });
      }
    }
    await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
  }
}
