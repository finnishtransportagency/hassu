import { AineistoManager, AineistoPathsPair, NahtavillaoloVaiheAineisto } from ".";
import { config } from "../../config";
import { LadattuTiedosto, LausuntoPyynto, NahtavillaoloVaihe } from "../../database/model";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";

export class LausuntoPyyntoAineisto extends AineistoManager<LausuntoPyynto[]> {
  private nahtavillaoloVaihe: NahtavillaoloVaihe | undefined;

  constructor(oid: string, vaihe: LausuntoPyynto[] | undefined | null, nahtavillaoloVaihe: NahtavillaoloVaihe | undefined | null) {
    super(oid, vaihe);
    this.nahtavillaoloVaihe = nahtavillaoloVaihe || undefined;
  }

  getLadatutTiedostot(_vaihe: LausuntoPyynto[]): LadattuTiedosto[] {
    return []; //Lausuntopyyntöihin ei liity muista tiedostoja kuin lisäaineistot
  }

  async handleChanges(): Promise<LausuntoPyynto[] | undefined> {
    const vaihe = await super.handleChanges();
    return vaihe?.filter((lausuntoPyynto: LausuntoPyynto) => !lausuntoPyynto.poistetaan);
  }

  getAineistot(vaihe: LausuntoPyynto[]): AineistoPathsPair[] {
    return vaihe.reduce((aineistoPathPairs, lausuntoPyynto) => {
      aineistoPathPairs = aineistoPathPairs.concat(this.getAineisto(lausuntoPyynto));
      return aineistoPathPairs;
    }, [] as AineistoPathsPair[]);
  }

  private getAineisto(lausuntoPyynto: LausuntoPyynto): AineistoPathsPair[] {
    return [
      {
        paths: this.projektiPaths.lausuntoPyynto(lausuntoPyynto),
        aineisto: lausuntoPyynto.lisaAineistot,
      },
    ];
  }

  async createZipOfAineisto(zipFileS3Key: string, lausuntoPyyntoId: number): Promise<LausuntoPyynto | undefined> {
    const lausuntoPyynto = this.vaihe?.find((lausuntoPyynto) => lausuntoPyynto.id === lausuntoPyyntoId);
    if (!lausuntoPyynto) return;
    const lausuntoPyyntoAineistotPaths = this.getAineisto(lausuntoPyynto);
    //Meitä kiinnostaa vain nähtävilläolovaiheen aineistot, joten voimme antaa nähtävilläoovaihejulkaisuksi undefined.
    const nahtavillaoloAineistoPaths = this.nahtavillaoloVaihe
      ? new NahtavillaoloVaiheAineisto(this.oid, this.nahtavillaoloVaihe, undefined).getAineistot(this.nahtavillaoloVaihe)
      : [];
    const aineistotPaths = lausuntoPyyntoAineistotPaths.concat(nahtavillaoloAineistoPaths);
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
