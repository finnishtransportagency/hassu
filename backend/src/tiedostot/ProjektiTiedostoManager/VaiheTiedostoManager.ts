import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { getZipFolder, makeFilePathDeleted } from ".";
import { Aineisto, DBProjekti, IlmoituksenVastaanottajat, KuulutusSaamePDFt, LadattuTiedosto } from "../../database/model";
import { ZipSourceFile, generateAndStreamZipfileToS3 } from "../zipFiles";
import { config } from "../../config";
import { AineistoTila, Kieli, ProjektiTyyppi, Status } from "hassu-common/graphql/apiModel";
import { fileService } from "../../files/fileService";
import { forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";
import { TiedostoManager } from "./TiedostoManager";
import { kuntametadata } from "hassu-common/kuntametadata";
import { translate } from "../../util/localization";
import { log } from "../../logger";

export abstract class VaiheTiedostoManager<T, J> extends TiedostoManager<T> {
  public readonly julkaisut: J[] | undefined;

  constructor(oid: string, vaihe: T | undefined | null, julkaisut: J[] | undefined | null) {
    super(oid, vaihe);
    this.julkaisut = julkaisut ?? undefined;
  }

  abstract synchronize(): Promise<boolean>;

  abstract getAsianhallintaSynkronointi(
    projekti: DBProjekti,
    asianhallintaEventId: string | null | undefined
  ): AsianhallintaSynkronointi | undefined;

  async createZipOfAineisto(zipFileS3Key: string, projektityyppi: ProjektiTyyppi | null | undefined): Promise<T | undefined> {
    if (!this.vaihe) {
      return undefined;
    }
    const aineistotPaths = this.getAineistot(this.vaihe);
    const filesToZip: ZipSourceFile[] = [];
    const yllapitoPath = this.projektiPaths.yllapitoFullPath;

    aineistotPaths
      .flatMap((aineistot) => aineistot.aineisto ?? [])
      .filter((aineisto) => aineisto.tila === AineistoTila.VALMIS)
      .forEach((aineisto) => {
        const zipFolder = getZipFolder(aineisto.kategoriaId, projektityyppi);
        filesToZip.push({ s3Key: yllapitoPath + aineisto.tiedosto, zipFolder });
      });

    await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
  }

  abstract deleteAineistotIfEpaaktiivinen(projektiStatus: Status): Promise<J[]>;

  protected async deleteFilesWhenEpaaktiivinen<T extends Record<string, unknown>, K extends keyof T>(
    obj: T | undefined | null,
    ...fields: K[]
  ): Promise<boolean> {
    let modified = false;
    for (const field of fields) {
      if (obj?.[field]) {
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

  async deleteSisainenTiedosto(path: string) {
    await fileService.deleteYllapitoSisainenFileFromProjekti({
      oid: this.oid,
      filePathInProjekti: path,
      reason: "Projekti on epäaktiivinen",
    });
  }

  protected async deleteAineistot(...aineistoArrays: (Array<Aineisto> | null | undefined)[]): Promise<boolean> {
    let modified = false;
    // Yhdistä kaikki aineistot yhdeksi taulukoksi
    const aineistot = aineistoArrays.filter((a) => !!a).reduce((prev: Aineisto[], cur) => prev.concat(cur ?? []), [] as Aineisto[]);

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

  protected async deleteAineistoZip(aineistopaketti: string) {
    log.info("Poistetaan aineisto zip: " + aineistopaketti);
    await fileService.deleteYllapitoFileFromProjekti({
      oid: this.oid,
      filePathInProjekti: aineistopaketti,
      reason: "Projekti on epäaktiivinen",
    });
    const publicFullFilePathInProjekti = aineistopaketti.replace(this.projektiPaths.yllapitoPath, this.projektiPaths.publicPath);
    await fileService.deletePublicFileFromProjekti({
      oid: this.oid,
      filePathInProjekti: publicFullFilePathInProjekti,
      reason: "Projekti on epäaktiivinen",
    });
  }

  protected getIlmoituksenVastaanottajat(vastaanottajat: IlmoituksenVastaanottajat | undefined | null) {
    const ilmoituksenVastaanottajat: string[] = [];
    for (const kunta of vastaanottajat?.kunnat ?? []) {
      ilmoituksenVastaanottajat.push(kuntametadata.nameForKuntaId(kunta.id, Kieli.SUOMI));
    }
    for (const viranomainen of vastaanottajat?.viranomaiset ?? []) {
      const viranomainenKaannos = translate("viranomainen." + viranomainen.nimi, Kieli.SUOMI);
      if (viranomainenKaannos) {
        ilmoituksenVastaanottajat.push(viranomainenKaannos);
      }
    }
    return ilmoituksenVastaanottajat;
  }
}
