import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { AineistoPathsPair, handleAineistot, makeFilePathDeleted } from ".";
import { Aineisto, DBProjekti, KuulutusSaamePDFt, LadattuTiedosto } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";
import { config } from "../../config";
import { AineistoTila, Status } from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";

export abstract class VaiheAineisto<T, J> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly julkaisut: J[] | undefined;
  public readonly projektiPaths: ProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null, julkaisut: J[] | undefined | null) {
    this.oid = oid;
    this.projektiPaths = new ProjektiPaths(oid);
    this.vaihe = vaihe || undefined;
    this.julkaisut = julkaisut || undefined;
  }

  abstract getAineistot(vaihe: T): AineistoPathsPair[];

  abstract getLadatutTiedostot(vaihe: T): LadattuTiedosto[];

  abstract synchronize(): Promise<boolean>;

  abstract getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined;

  async handleChanges(): Promise<T | undefined> {
    if (this.vaihe) {
      let changes = false;
      for (const element of this.getAineistot(this.vaihe)) {
        changes = (await handleAineistot(this.oid, element.aineisto, element.paths)) || changes;
      }
      if (changes) {
        return this.vaihe;
      }
    }
  }

  async createZipOfAineisto(zipFileS3Key: string): Promise<T | undefined> {
    if (!this.vaihe) return;
    const aineistotPaths = this.getAineistot(this.vaihe);
    const filesToZip: ZipSourceFile[] = [];
    const yllapitoPath = new ProjektiPaths(this.oid).yllapitoFullPath;
    for (const aineistot of aineistotPaths) {
      if (!aineistot.aineisto) return;
      for (const aineisto of aineistot.aineisto) {
        const folder = aineisto.kategoriaId + "/";
        filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder: aineisto.kategoriaId ? folder : undefined });
      }
    }

    await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
  }

  isReady(): boolean {
    function hasAllAineistoValmis(element: AineistoPathsPair): boolean {
      if (!element.aineisto) {
        return true;
      }
      return element.aineisto?.every((a) => a.tila == AineistoTila.VALMIS);
    }

    let ready = true;
    if (this.vaihe) {
      const aineistot = this.getAineistot(this.vaihe);
      for (const element of aineistot) {
        const tmp = hasAllAineistoValmis(element);
        ready = ready && tmp;
      }

      const ladatutTiedostot = this.getLadatutTiedostot(this.vaihe);
      for (const ladattuTiedosto of ladatutTiedostot) {
        ready = ready && !!ladattuTiedosto.tuotu;
      }
    }
    return ready;
  }

  abstract deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<J[]>;

  protected async deleteFilesWhenEpaaktiivinen<T extends Record<string, unknown>, K extends keyof T>(
    obj: T | undefined | null,
    ...fields: K[]
  ): Promise<boolean> {
    let modified = false;
    for (const field of fields) {
      if (obj && obj[field]) {
        const filepath = obj[field] as unknown as string;
        await fileService.deleteYllapitoFileFromProjekti({
          filePathInProjekti: filepath,
          reason: "Projekti on epäaktiivinen",
          oid: this.oid,
        });
        obj[field] = makeFilePathDeleted(filepath) as unknown as T[K];
        modified = true;
      }
    }
    return modified;
  }

  async deleteKuulutusSaamePDFtWhenEpaaktiivinen(saamePDFt: KuulutusSaamePDFt | undefined | null): Promise<boolean> {
    let modified = false;
    if (saamePDFt) {
      await forEverySaameDoAsync(async (kieli) => {
        const saamePDF = saamePDFt?.[kieli];
        if (saamePDF) {
          modified = (await this.deleteLadattuTiedostoWhenEpaaktiivinen(saamePDF.kuulutusPDF)) || modified;
          modified = (await this.deleteLadattuTiedostoWhenEpaaktiivinen(saamePDF.kuulutusIlmoitusPDF)) || modified;
        }
      });
    }
    return modified;
  }

  protected async deleteLadattuTiedostoWhenEpaaktiivinen(obj: LadattuTiedosto | undefined | null): Promise<boolean> {
    if (obj) {
      const filepath = obj.tiedosto;
      await fileService.deleteYllapitoFileFromProjekti({
        filePathInProjekti: filepath,
        reason: "Projekti on epäaktiivinen",
        oid: this.oid,
      });
      obj.tiedosto = makeFilePathDeleted(filepath);
      obj.tuotu = null;
      return true;
    }
    return false;
  }

  protected async deleteAineistot(...aineistoArrays: (Array<Aineisto> | null | undefined)[]): Promise<boolean> {
    let modified = false;
    // Yhdistä kaikki aineistot yhdeksi taulukoksi
    const aineistot = aineistoArrays.filter((a) => !!a).reduce((prev: Aineisto[], cur) => prev.concat(cur || []), [] as Aineisto[]);

    for (const aineisto of aineistot) {
      await fileService.deleteAineisto(
        this.oid,
        aineisto,
        this.projektiPaths.yllapitoPath,
        this.projektiPaths.publicPath,
        "Projekti on epäaktiivinen"
      );
      aineisto.tila = AineistoTila.POISTETTU;
      modified = true;
    }
    return modified;
  }
}
