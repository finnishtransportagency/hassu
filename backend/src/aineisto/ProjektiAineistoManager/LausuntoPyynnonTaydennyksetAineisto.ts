import { AineistoManager, AineistoPathsPair } from ".";
import { config } from "../../config";
import { LadattuTiedosto, LausuntoPyynnonTaydennys } from "../../database/model";
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
    // Aineistot on poistettu nyt kaikista eri lausuntopyyntöjen täydennyuksistä, joten poistettavaksi merkityt lausuntopyytöjen täydennykset
    // voi oikeasti poistaa.
    // Tässä funktiossa palautettu lausuntopyyntöjen täydennykset -array tallennetaan kutsuvassa funktiossa projektin lausuntopyyntöjen täydennyksiksi,
    // eli poistetuksi merkityt lausuntopyyntöjen täydennykset tulevat poistetuksi.
    return vaihe?.filter((lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) => !lausuntoPyynnonTaydennys.poistetaan);
  }

  async createZipOfAineisto(zipFileS3Key: string, kuntaId: number): Promise<LausuntoPyynnonTaydennys | undefined> {
    const lausuntoPyynnonTaydennys = this.vaihe?.find((lausuntoPyynnonTaydennys) => lausuntoPyynnonTaydennys.kunta === kuntaId);
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
