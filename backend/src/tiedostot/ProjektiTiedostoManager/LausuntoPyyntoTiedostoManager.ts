import { AineistoTila, Kieli } from "hassu-common/graphql/apiModel";
import { TiedostoManager, AineistoPathsPair, NahtavillaoloVaiheTiedostoManager } from ".";
import { config } from "../../config";
import { LadattuTiedosto, LausuntoPyynto, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { fileService } from "../../files/fileService";
import { findLatestHyvaksyttyJulkinenNahtavillaoloVaiheJulkaisu } from "../../util/lausuntoPyyntoUtil";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";
import { translate } from "../../util/localization";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";

export class LausuntoPyyntoTiedostoManager extends TiedostoManager<LausuntoPyynto[]> {
  private nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[] | undefined;

  constructor(
    oid: string,
    vaihe: LausuntoPyynto[] | undefined | null,
    nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[] | undefined | null
  ) {
    super(oid, vaihe);
    this.nahtavillaoloVaiheJulkaisut = nahtavillaoloVaiheJulkaisut || undefined;
  }

  getLadatutTiedostot(_vaihe: LausuntoPyynto[]): LadattuTiedostoPathsPair[] {
    return []; //Lausuntopyyntöihin ei liity muita tiedostoja kuin lisäaineistot
  }

  async handleChanges(): Promise<LausuntoPyynto[] | undefined> {
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
    const otherChanges = super.handleChanges();
    return somethingRemoved ? this.vaihe : otherChanges;
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

  async createZipOfAineisto(zipFileS3Key: string, lausuntoPyyntoUuid: string): Promise<LausuntoPyynto | undefined> {
    const lausuntoPyynto = this.vaihe?.find((lausuntoPyynto) => lausuntoPyynto.uuid === lausuntoPyyntoUuid);
    if (!lausuntoPyynto) return;
    const lausuntoPyyntoAineistotPaths = this.getAineisto(lausuntoPyynto);
    const latestHyvaksyttyNahtavillaoloVaiheJulkaisu = findLatestHyvaksyttyJulkinenNahtavillaoloVaiheJulkaisu({
      nahtavillaoloVaiheJulkaisut: this.nahtavillaoloVaiheJulkaisut,
    });
    // Meitä kiinnostaa vain nähtävilläolovaihejulkaisujen aineistot, joten voimme antaa nähtävilläoovaiheeksi undefined.
    const nahtavillaoloAineistoPaths = latestHyvaksyttyNahtavillaoloVaiheJulkaisu
      ? new NahtavillaoloVaiheTiedostoManager(this.oid, undefined, this.nahtavillaoloVaiheJulkaisut).getAineistot(
          latestHyvaksyttyNahtavillaoloVaiheJulkaisu
        )
      : [];
    const filesToZip: ZipSourceFile[] = [];
    const yllapitoPath = this.projektiPaths.yllapitoFullPath;

    for (const aineistot of nahtavillaoloAineistoPaths) {
      if (aineistot.aineisto) {
        for (const aineisto of aineistot.aineisto) {
          if (aineisto.tila === AineistoTila.VALMIS) {
            const folder = translate("aineisto-kategoria-nimi." + aineisto.kategoriaId, Kieli.SUOMI) + "/";
            filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder: aineisto.kategoriaId ? folder : undefined });
          }
        }
      }
    }
    for (const aineistot of lausuntoPyyntoAineistotPaths) {
      if (aineistot.aineisto) {
        for (const aineisto of aineistot.aineisto) {
          if (aineisto.tila === AineistoTila.VALMIS) {
            const category = aineisto.kategoriaId ? translate("aineisto-kategoria-nimi." + aineisto.kategoriaId, Kieli.SUOMI) + "/" : "";
            const folder = "lisa-aineistot/" + category;
            filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder: folder });
          }
        }
      }
    }

    await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
  }
}
