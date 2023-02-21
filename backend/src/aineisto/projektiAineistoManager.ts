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
  VuorovaikutusTilaisuusJulkaisu,
} from "../database/model";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { AineistoTila, KuulutusJulkaisuTila, VuorovaikutusTilaisuusTyyppi } from "../../../common/graphql/apiModel";
import { findJulkaisuWithTila } from "../projekti/projektiUtil";
import { parseDate, parseOptionalDate } from "../util/dateUtil";
import { aineistoService, synchronizeFilesToPublic } from "./aineistoService";
import { velho } from "../velho/velhoClient";
import { getAxios } from "../aws/monitoring";
import * as mime from "mime-types";
import { fileService } from "../files/fileService";
import dayjs, { Dayjs } from "dayjs";
import contentDisposition from "content-disposition";

export enum PublishOrExpireEventType {
  PUBLISH = "PUBLISH",
  EXPIRE = "EXPIRE",
}

export type PublishOrExpireEvent = {
  type: PublishOrExpireEventType;
  date: Dayjs;
  reason: string;
};

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
      this.projekti.vuorovaikutusKierrosJulkaisut,
      this.getNahtavillaoloVaihe()
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

  getSchedule(): PublishOrExpireEvent[] {
    return Array<PublishOrExpireEvent>()
      .concat(this.getAloitusKuulutusVaihe().getSchedule())
      .concat(this.getVuorovaikutusKierros().getSchedule())
      .concat(this.getNahtavillaoloVaihe().getSchedule())
      .concat(this.getHyvaksymisPaatosVaihe().getSchedule())
      .concat(this.getJatkoPaatos1Vaihe().getSchedule())
      .concat(this.getJatkoPaatos2Vaihe().getSchedule())
      .sort((a, b) => a.date.date() - b.date.date());
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

  abstract getSchedule(): PublishOrExpireEvent[];

  abstract isAineistoVisible(julkaisu: J): boolean;
}

export class AloitusKuulutusAineisto extends VaiheAineisto<AloitusKuulutus, AloitusKuulutusJulkaisu> {
  getAineistot(): AineistoPathsPair[] {
    return [];
  }

  async synchronize(): Promise<void> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      await synchronizeFilesToPublic(
        this.oid,
        new ProjektiPaths(this.oid).aloituskuulutus(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva)
      );
    }
  }

  getSchedule(): PublishOrExpireEvent[] {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu && julkaisu.kuulutusPaiva) {
      return [
        {
          reason: "Aloituskuulutus julkaisupäivä",
          type: PublishOrExpireEventType.PUBLISH,
          date: parseDate(julkaisu.kuulutusPaiva).startOf("day"),
        },
      ];
    }
    return [];
  }

  isAineistoVisible(julkaisu: AloitusKuulutusJulkaisu): boolean {
    return !!julkaisu && !!julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(dayjs());
  }
}

export class VuorovaikutusKierrosAineisto extends VaiheAineisto<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  private nahtavillaoloVaiheAineisto: NahtavillaoloVaiheAineisto;

  constructor(
    oid: string,
    vaihe: VuorovaikutusKierros | undefined | null,
    julkaisut: VuorovaikutusKierrosJulkaisu[] | undefined | null,
    nahtavillaoloVaiheAineisto: NahtavillaoloVaiheAineisto
  ) {
    super(oid, vaihe, julkaisut);
    this.nahtavillaoloVaiheAineisto = nahtavillaoloVaiheAineisto;
  }

  getAineistot(vaihe: VuorovaikutusKierros): AineistoPathsPair[] {
    const filePathInProjekti = this.projektiPaths.vuorovaikutus(vaihe).aineisto;
    return [
      { aineisto: vaihe.esittelyaineistot, paths: filePathInProjekti },
      { aineisto: vaihe.suunnitelmaluonnokset, paths: filePathInProjekti },
    ];
  }

  async synchronize(): Promise<void> {
    await this.julkaisut?.reduce(async (promise, julkaisu) => {
      await promise;
      const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
      // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
      const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheAineisto.getKuulutusPaiva();
      return synchronizeFilesToPublic(this.oid, new ProjektiPaths(this.oid).vuorovaikutus(julkaisu), kuulutusPaiva, kuulutusPaattyyPaiva);
    }, Promise.resolve());
  }

  getSchedule(): PublishOrExpireEvent[] {
    return (
      this.julkaisut?.reduce((schedule, julkaisu: VuorovaikutusKierrosJulkaisu) => {
        const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
        if (kuulutusPaiva) {
          schedule.push({
            reason: "VuorovaikutusKierrosAineisto julkaisu",
            type: PublishOrExpireEventType.PUBLISH,
            date: kuulutusPaiva.startOf("day"),
          });
        }
        // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
        const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheAineisto.getKuulutusPaiva();
        if (kuulutusPaattyyPaiva) {
          schedule.push({
            reason: "VuorovaikutusKierrosAineisto julkaisu päättyy",
            type: PublishOrExpireEventType.EXPIRE,
            date: kuulutusPaattyyPaiva.startOf("day"),
          });
        }

        // Linkki verkossa julkaistaan 2 tuntia ennen tilaisuuden alkua. Linkki poistetaan verkosta tilaisuuden loputtua. Ajastetaan projektin tiedot päivittymään noina aikoina.
        julkaisu.vuorovaikutusTilaisuudet
          ?.filter((tilaisuus: VuorovaikutusTilaisuusJulkaisu) => tilaisuus.tyyppi == VuorovaikutusTilaisuusTyyppi.VERKOSSA)
          .forEach((tilaisuus: VuorovaikutusTilaisuusJulkaisu) => {
            schedule.push({
              reason: "VuorovaikutusTilaisuus linkki julkaistaan",
              type: PublishOrExpireEventType.EXPIRE,
              date: getVuorovaikutusTilaisuusLinkkiPublicationTime(tilaisuus),
            });
            schedule.push({
              reason: "VuorovaikutusTilaisuus linkki pois näkyvistä",
              type: PublishOrExpireEventType.EXPIRE,
              date: getVuorovaikutusTilaisuusLinkkiExpirationTime(tilaisuus),
            });
          });
        return schedule;
      }, [] as PublishOrExpireEvent[]) || ([] as PublishOrExpireEvent[])
    );
  }

  isAineistoVisible(julkaisu: VuorovaikutusKierrosJulkaisu): boolean {
    const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
    let julkinen = false;
    if (kuulutusPaiva && kuulutusPaiva.isBefore(dayjs())) {
      julkinen = true;
    }
    // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
    const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheAineisto.getKuulutusPaiva();
    if (kuulutusPaattyyPaiva && kuulutusPaattyyPaiva.isBefore(dayjs())) {
      julkinen = false;
    }
    return julkinen;
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
      await synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.nahtavillaoloVaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)
      );
    }
  }

  getSchedule(): PublishOrExpireEvent[] {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisu(julkaisu, "NahtavillaoloVaiheAineisto");
  }

  getKuulutusPaiva(): Dayjs | undefined {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return parseOptionalDate(julkaisu.kuulutusPaiva);
    }
  }

  isAineistoVisible(julkaisu: NahtavillaoloVaiheJulkaisu): boolean {
    return isVaiheAineistoVisible(julkaisu);
  }
}

abstract class AbstractHyvaksymisPaatosVaiheAineisto extends VaiheAineisto<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
  getScheduleFor(description: string): PublishOrExpireEvent[] {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisu(julkaisu, description);
  }

  isAineistoVisible(julkaisu: HyvaksymisPaatosVaiheJulkaisu): boolean {
    return isVaiheAineistoVisible(julkaisu);
  }
}

export class HyvaksymisPaatosVaiheAineisto extends AbstractHyvaksymisPaatosVaiheAineisto {
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
      await synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.hyvaksymisPaatosVaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)
      );
    }
  }

  getSchedule(): PublishOrExpireEvent[] {
    return super.getScheduleFor("HyvaksymisPaatosVaiheAineisto");
  }
}

export class JatkoPaatos1VaiheAineisto extends AbstractHyvaksymisPaatosVaiheAineisto {
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
      await synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.jatkoPaatos1Vaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)
      );
    }
  }

  getSchedule(): PublishOrExpireEvent[] {
    return super.getScheduleFor("JatkoPaatos1VaiheAineisto");
  }
}

export class JatkoPaatos2VaiheAineisto extends AbstractHyvaksymisPaatosVaiheAineisto {
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
      await synchronizeFilesToPublic(
        this.oid,
        new ProjektiPaths(this.oid).jatkoPaatos2Vaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)
      );
    }
  }

  getSchedule(): PublishOrExpireEvent[] {
    return super.getScheduleFor("JatkoPaatos2VaiheAineisto");
  }
}

function getPublishExpireScheduleForVaiheJulkaisu(
  julkaisu: NahtavillaoloVaiheJulkaisu | HyvaksymisPaatosVaiheJulkaisu | undefined,
  description: string
): PublishOrExpireEvent[] {
  const events: PublishOrExpireEvent[] = [];
  if (julkaisu) {
    const kuulutusPaiva = parseOptionalDate(julkaisu.kuulutusPaiva);
    if (kuulutusPaiva) {
      events.push({
        reason: description + " kuulutuspäivä",
        type: PublishOrExpireEventType.PUBLISH,
        date: kuulutusPaiva.startOf("day"),
      });
    }

    const kuulutusVaihePaattyyPaiva = parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva);
    if (kuulutusVaihePaattyyPaiva) {
      events.push({
        reason: description + " kuulutusvaihe päättyy",
        type: PublishOrExpireEventType.EXPIRE,
        date: kuulutusVaihePaattyyPaiva.endOf("day"),
      });
    }
  }
  return events;
}

function isVaiheAineistoVisible(julkaisu: HyvaksymisPaatosVaiheJulkaisu | NahtavillaoloVaiheJulkaisu) {
  return (
    !!julkaisu &&
    !!julkaisu.kuulutusPaiva &&
    parseDate(julkaisu.kuulutusPaiva).isBefore(dayjs()) &&
    !!julkaisu.kuulutusVaihePaattyyPaiva &&
    parseDate(julkaisu.kuulutusVaihePaattyyPaiva).isAfter(dayjs())
  );
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
  const axiosResponse = await getAxios().get(sourceURL, { responseType: "arraybuffer" });
  const disposition: string = axiosResponse.headers["content-disposition"];
  const fileName = contentDisposition.parse(disposition).parameters.filename;
  if (!fileName) {
    throw new Error("Tiedoston nimeä ei pystytty päättelemään: '" + disposition + "'");
  }
  const contentType = mime.lookup(fileName);
  aineisto.tiedosto = await fileService.createAineistoToProjekti({
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

export function getVuorovaikutusTilaisuusLinkkiPublicationTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu): Dayjs {
  return parseDate(tilaisuus.paivamaara + "T" + tilaisuus.alkamisAika).subtract(2, "hours");
}

export function getVuorovaikutusTilaisuusLinkkiExpirationTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu): Dayjs {
  return parseDate(tilaisuus.paivamaara + "T" + tilaisuus.paattymisAika);
}

export function isVerkkotilaisuusLinkkiVisible(julkaisu: VuorovaikutusTilaisuusJulkaisu): boolean {
  const now = dayjs();
  return (
    getVuorovaikutusTilaisuusLinkkiPublicationTime(julkaisu).isBefore(now) &&
    getVuorovaikutusTilaisuusLinkkiExpirationTime(julkaisu).isAfter(now)
  );
}
