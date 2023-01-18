import {
  Aineisto,
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
} from "../database/model";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { AineistoTila, KuulutusJulkaisuTila } from "../../../common/graphql/apiModel";
import { findJulkaisuWithTila } from "../projekti/projektiUtil";
import { parseDate } from "../util/dateUtil";
import { aineistoService, synchronizeFilesToPublic } from "./aineistoService";
import { velho } from "../velho/velhoClient";
import { getAxios } from "../aws/monitoring";
import * as mime from "mime-types";
import { fileService } from "../files/fileService";
import dayjs from "dayjs";

export class ProjektiAineistoManager {
  private projekti: DBProjekti;

  constructor(projekti: DBProjekti) {
    this.projekti = projekti;
  }

  isReady(): boolean {
    return (
      this.getAloitusKuulutusVaihe().isReady() &&
      this.getVuorovaikutusKierros().isReady() &&
      this.getNahtavillaoloVaihe().isReady() &&
      this.getHyvaksymisPaatosVaihe().isReady() &&
      this.getJatkoPaatos1Vaihe().isReady() &&
      this.getJatkoPaatos2Vaihe().isReady()
    );
  }

  getAloitusKuulutusVaihe(): AloitusKuulutusAineisto {
    return new AloitusKuulutusAineisto(this.projekti.oid, this.projekti.aloitusKuulutus, this.projekti.aloitusKuulutusJulkaisut);
  }

  getNahtavillaoloVaihe(): NahtavillaoloVaiheAineisto {
    return new NahtavillaoloVaiheAineisto(this.projekti.oid, this.projekti.nahtavillaoloVaihe, this.projekti.nahtavillaoloVaiheJulkaisut);
  }

  getVuorovaikutusKierros(): VuorovaikutusKierrosAineisto {
    return new VuorovaikutusKierrosAineisto(
      this.projekti.oid,
      this.projekti.vuorovaikutusKierros,
      this.projekti.vuorovaikutusKierrosJulkaisut
    );
  }

  getHyvaksymisPaatosVaihe(): HyvaksymisPaatosVaiheAineisto {
    return new HyvaksymisPaatosVaiheAineisto(
      this.projekti.oid,
      this.projekti.hyvaksymisPaatosVaihe,
      this.projekti.hyvaksymisPaatosVaiheJulkaisut
    );
  }

  getJatkoPaatos1Vaihe(): JatkoPaatos1VaiheAineisto {
    return new JatkoPaatos1VaiheAineisto(this.projekti.oid, this.projekti.jatkoPaatos1Vaihe, this.projekti.jatkoPaatos1VaiheJulkaisut);
  }

  getJatkoPaatos2Vaihe(): JatkoPaatos2VaiheAineisto {
    return new JatkoPaatos2VaiheAineisto(this.projekti.oid, this.projekti.jatkoPaatos2Vaihe, this.projekti.jatkoPaatos2VaiheJulkaisut);
  }
}

type AineistoPathsPair = { aineisto: Aineisto[] | null | undefined; paths: PathTuple };

abstract class VaiheAineisto<T, J> {
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

  abstract synchronize(): Promise<void>;

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

  isReady(): boolean {
    function hasAllAineistoValmis(element: AineistoPathsPair): boolean {
      if (!element.aineisto) {
        return true;
      }
      return element.aineisto?.every((a) => a.tila == AineistoTila.VALMIS);
    }

    if (this.vaihe) {
      const aineistot = this.getAineistot(this.vaihe);
      if (aineistot.length > 0) {
        let ready = true;
        for (const element of aineistot) {
          const tmp = hasAllAineistoValmis(element);
          ready = ready && tmp;
        }
        return ready;
      }
    }
    return true;
  }
}

export class AloitusKuulutusAineisto extends VaiheAineisto<AloitusKuulutus, AloitusKuulutusJulkaisu> {
  getAineistot(): AineistoPathsPair[] {
    return [];
  }

  async synchronize(): Promise<void> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      const kuulutusPaiva = julkaisu?.kuulutusPaiva ? parseDate(julkaisu.kuulutusPaiva) : undefined;
      await synchronizeFilesToPublic(this.oid, new ProjektiPaths(this.oid).aloituskuulutus(julkaisu), kuulutusPaiva);
    }
  }
}

export class VuorovaikutusKierrosAineisto extends VaiheAineisto<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  getAineistot(vaihe: VuorovaikutusKierros): AineistoPathsPair[] {
    const filePathInProjekti = this.projektiPaths.vuorovaikutus(vaihe).aineisto;
    return [
      { aineisto: vaihe.esittelyaineistot, paths: filePathInProjekti },
      { aineisto: vaihe.suunnitelmaluonnokset, paths: filePathInProjekti },
    ];
  }

  async synchronize(): Promise<void> {
    await this.julkaisut?.reduce(async (promise, julkaisu) => {
      const kuulutusPaiva = julkaisu?.vuorovaikutusJulkaisuPaiva ? parseDate(julkaisu.vuorovaikutusJulkaisuPaiva) : undefined;
      await promise;
      return synchronizeFilesToPublic(this.oid, new ProjektiPaths(this.oid).vuorovaikutus(julkaisu), kuulutusPaiva);
    }, Promise.resolve());
  }
}

export class NahtavillaoloVaiheAineisto extends VaiheAineisto<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getAineistot(vaihe: NahtavillaoloVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.nahtavillaoloVaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.lisaAineisto, paths },
    ];
  }

  async synchronize(): Promise<void> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      await synchronizeFilesToPublic(this.oid, this.projektiPaths.nahtavillaoloVaihe(julkaisu), getKuulutusPaiva(julkaisu));
    }
  }
}

export class HyvaksymisPaatosVaiheAineisto extends VaiheAineisto<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.hyvaksymisPaatosVaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  async synchronize(): Promise<void> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      await synchronizeFilesToPublic(this.oid, this.projektiPaths.hyvaksymisPaatosVaihe(julkaisu), getKuulutusPaiva(julkaisu));
    }
  }
}

export class JatkoPaatos1VaiheAineisto extends VaiheAineisto<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.jatkoPaatos1Vaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  async synchronize(): Promise<void> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      await synchronizeFilesToPublic(this.oid, this.projektiPaths.jatkoPaatos1Vaihe(julkaisu), getKuulutusPaiva(julkaisu));
    }
  }
}

export class JatkoPaatos2VaiheAineisto extends VaiheAineisto<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.jatkoPaatos2Vaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  async synchronize(): Promise<void> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      await synchronizeFilesToPublic(this.oid, new ProjektiPaths(this.oid).jatkoPaatos2Vaihe(julkaisu), getKuulutusPaiva(julkaisu));
    }
  }
}

async function handleAineistot(oid: string, aineistot: Aineisto[] | null | undefined, paths: PathTuple): Promise<boolean> {
  if (!aineistot) {
    return false;
  }
  let hasChanges = false;
  const originalAineistot = aineistot.splice(0, aineistot.length); // Move list contents to a separate list. Aineistot list contents are formed in the following loop
  for (const aineisto of originalAineistot) {
    if (aineisto.tila == AineistoTila.ODOTTAA_POISTOA) {
      await aineistoService.deleteAineisto(oid, aineisto, paths.yllapitoPath, paths.publicPath);
      hasChanges = true;
    } else if (aineisto.tila == AineistoTila.ODOTTAA_TUONTIA) {
      await importAineisto(aineisto, oid, paths);
      aineistot.push(aineisto);
      hasChanges = true;
    } else {
      aineistot.push(aineisto);
    }
  }

  return hasChanges;
}

async function importAineisto(aineisto: Aineisto, oid: string, path: PathTuple) {
  const sourceURL = await velho.getLinkForDocument(aineisto.dokumenttiOid);
  const axiosResponse = await getAxios().get(sourceURL);
  const disposition: string = axiosResponse.headers["content-disposition"];
  const fileName = parseFilenameFromContentDisposition(disposition);
  if (!fileName) {
    throw new Error("Tiedoston nimeä ei pystytty päättelemään");
  }
  const contentType = mime.lookup(fileName);
  aineisto.tiedosto = await fileService.createFileToProjekti({
    oid,
    path,
    fileName,
    contentType: contentType || undefined,
    inline: true,
    contents: axiosResponse.data,
  });
  aineisto.tila = AineistoTila.VALMIS;
  aineisto.tuotu = dayjs().format();
}

function parseFilenameFromContentDisposition(disposition: string): string | null {
  const utf8FilenameRegex = /filename\*=UTF-8''([\w%\-\\.]+)(?:; ?|$)/i;
  const asciiFilenameRegex = /filename=(["']?)(.*?[^\\])\1(?:; ?|$)/i;

  let fileName: string | null = null;
  if (utf8FilenameRegex.test(disposition)) {
    const regexResult = utf8FilenameRegex.exec(disposition);
    if (regexResult) {
      fileName = decodeURIComponent(regexResult[1]);
    }
  } else {
    const matches = asciiFilenameRegex.exec(disposition);
    if (matches != null && matches[2]) {
      fileName = matches[2];
    }
  }
  return fileName;
}

function getKuulutusPaiva(julkaisu: NahtavillaoloVaiheJulkaisu) {
  return julkaisu.kuulutusPaiva ? parseDate(julkaisu.kuulutusPaiva) : undefined;
}
