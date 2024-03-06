import {
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
import { ProjektiPaths } from "../files/ProjektiPath";
import { KuulutusJulkaisuTila, VuorovaikutusTilaisuusTyyppi } from "hassu-common/graphql/apiModel";
import { findJulkaisutWithTila, findJulkaisuWithTila } from "../projekti/projektiUtil";
import { DateAddTuple, isDateTimeInThePast, nyt, parseDate, parseOptionalDate } from "../util/dateUtil";
import { Dayjs } from "dayjs";
import { uniqBy } from "lodash";
import { HYVAKSYMISPAATOS_DURATION, JATKOPAATOS_DURATION } from "../projekti/status/statusHandler";

export enum PublishOrExpireEventType {
  PUBLISH = "PUBLISH",
  EXPIRE = "EXPIRE",
  PUBLISH_ALOITUSKUULUTUS = "PUBLISH_ALOITUSKUULUTUS",
  PUBLISH_VUOROVAIKUTUS = "PUBLISH_VUOROVAIKUTUS",
  PUBLISH_VUOROVAIKUTUSTILAISUUS = "PUBLISH_VUOROVAIKUTUSTILAISUUS",
  PUBLISH_NAHTAVILLAOLO = "PUBLISH_NAHTAVILLAOLO",
  PUBLISH_HYVAKSYMISPAATOSVAIHE = "PUBLISH_HYVAKSYMISPAATOSVAIHE",
  PUBLISH_JATKOPAATOS1VAIHE = "PUBLISH_JATKOPAATOS1VAIHE",
  PUBLISH_JATKOPAATOS2VAIHE = "PUBLISH_JATKOPAATOS2VAIHE",
  PUBLISH_HYVAKSYMISPAATOS_EPAAKTIVOITUU_KK = "PUBLISH_HYVAKSYMISPAATOS_EPAAKTIVOITUU_KK",
}

export type PublishOrExpireEvent = {
  type: PublishOrExpireEventType;
  date: Dayjs;
  reason: string;
};

export class ProjektiScheduleManager {
  private projekti: DBProjekti;

  constructor(projekti: DBProjekti) {
    this.projekti = projekti;
  }

  getAloitusKuulutusVaihe(): AloitusKuulutusScheduleManager {
    return new AloitusKuulutusScheduleManager(this.projekti.oid, this.projekti.aloitusKuulutus, this.projekti.aloitusKuulutusJulkaisut);
  }

  getNahtavillaoloVaihe(): NahtavillaoloVaiheScheduleManager {
    return new NahtavillaoloVaiheScheduleManager(
      this.projekti.oid,
      this.projekti.nahtavillaoloVaihe,
      this.projekti.nahtavillaoloVaiheJulkaisut
    );
  }

  getVuorovaikutusKierros(): VuorovaikutusKierrosScheduleManager {
    return new VuorovaikutusKierrosScheduleManager(
      this.projekti.oid,
      this.projekti.vuorovaikutusKierros,
      this.projekti.vuorovaikutusKierrosJulkaisut,
      this.getNahtavillaoloVaihe()
    );
  }

  getVuorovaikutusKierrosJulkaisut(): VuorovaikutusKierrosJulkaisuScheduleManager[] {
    return (
      this.projekti.vuorovaikutusKierrosJulkaisut?.map(
        (julkaisu) => new VuorovaikutusKierrosJulkaisuScheduleManager(this.projekti.oid, julkaisu)
      ) ?? []
    );
  }

  getHyvaksymisPaatosVaihe(): HyvaksymisPaatosVaiheScheduleManager {
    return new HyvaksymisPaatosVaiheScheduleManager(
      this.projekti.oid,
      this.projekti.hyvaksymisPaatosVaihe,
      this.projekti.hyvaksymisPaatosVaiheJulkaisut
    );
  }

  getJatkoPaatos1Vaihe(): JatkoPaatos1VaiheScheduleManager {
    return new JatkoPaatos1VaiheScheduleManager(
      this.projekti.oid,
      this.projekti.jatkoPaatos1Vaihe,
      this.projekti.jatkoPaatos1VaiheJulkaisut
    );
  }

  getJatkoPaatos2Vaihe(): JatkoPaatos2VaiheScheduleManager {
    return new JatkoPaatos2VaiheScheduleManager(
      this.projekti.oid,
      this.projekti.jatkoPaatos2Vaihe,
      this.projekti.jatkoPaatos2VaiheJulkaisut
    );
  }

  getSchedule(): PublishOrExpireEvent[] {
    const publishOrExpireEvents = Array<PublishOrExpireEvent>()
      .concat(this.getAloitusKuulutusVaihe().getSchedule())
      .concat(this.getVuorovaikutusKierros().getSchedule())
      .concat(this.getNahtavillaoloVaihe().getSchedule())
      .concat(this.getHyvaksymisPaatosVaihe().getSchedule())
      .concat(this.getJatkoPaatos1Vaihe().getSchedule())
      .concat(this.getJatkoPaatos2Vaihe().getSchedule());
    const schedule = uniqBy(publishOrExpireEvents, (event) => `${event.date.format("YYYY-MM-DDTHH:mm:ss")}-${event.type}`); // Poista duplikaatit
    return schedule.sort((a, b) => a.date.date() - b.date.date());
  }
}

export abstract class VaiheScheduleManager<T, J> {
  public readonly oid: string;
  public readonly vaihe: T | undefined;
  public readonly julkaisut: J[] | undefined;
  public readonly projektiPaths: ProjektiPaths;

  constructor(oid: string, vaihe: T | undefined | null, julkaisut: J[] | undefined | null) {
    this.oid = oid;
    this.projektiPaths = new ProjektiPaths(oid);
    this.vaihe = vaihe ?? undefined;
    this.julkaisut = julkaisut ?? undefined;
  }

  abstract getSchedule(): PublishOrExpireEvent[];

  abstract isAineistoVisible(julkaisu: J): boolean;
}

export class AloitusKuulutusScheduleManager extends VaiheScheduleManager<AloitusKuulutus, AloitusKuulutusJulkaisu> {
  getSchedule(): PublishOrExpireEvent[] {
    return (
      findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY)?.reduce((schedule: PublishOrExpireEvent[], julkaisu) => {
        if (julkaisu.kuulutusPaiva) {
          schedule.push({
            reason: "Aloituskuulutus julkaisupäivä",
            type: PublishOrExpireEventType.PUBLISH_ALOITUSKUULUTUS,
            date: parseDate(julkaisu.kuulutusPaiva).startOf("day"),
          });
        }
        return schedule;
      }, []) ?? []
    );
  }

  isAineistoVisible(julkaisu: AloitusKuulutusJulkaisu): boolean {
    return !!julkaisu && !!julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(nyt());
  }
}

export class VuorovaikutusKierrosScheduleManager extends VaiheScheduleManager<VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu> {
  private nahtavillaoloVaiheScheduleManager: NahtavillaoloVaiheScheduleManager;

  constructor(
    oid: string,
    vaihe: VuorovaikutusKierros | undefined | null,
    julkaisut: VuorovaikutusKierrosJulkaisu[] | undefined | null,
    nahtavillaoloVaiheScheduleManager: NahtavillaoloVaiheScheduleManager
  ) {
    super(oid, vaihe, julkaisut);
    this.nahtavillaoloVaiheScheduleManager = nahtavillaoloVaiheScheduleManager;
  }

  getSchedule(): PublishOrExpireEvent[] {
    return (
      this.julkaisut?.reduce((schedule, julkaisu: VuorovaikutusKierrosJulkaisu) => {
        const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
        if (kuulutusPaiva) {
          schedule.push({
            reason: "VuorovaikutusKierros julkaisu",
            type: PublishOrExpireEventType.PUBLISH_VUOROVAIKUTUS,
            date: kuulutusPaiva.startOf("day"),
          });
        }
        // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
        const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheScheduleManager.getKuulutusPaiva();
        if (kuulutusPaattyyPaiva) {
          schedule.push({
            reason: "VuorovaikutusKierros kuulutus päättyy",
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
              type: PublishOrExpireEventType.PUBLISH_VUOROVAIKUTUSTILAISUUS,
              date: getVuorovaikutusTilaisuusLinkkiPublicationTime(tilaisuus),
            });
            schedule.push({
              reason: "VuorovaikutusTilaisuus linkki pois näkyvistä",
              type: PublishOrExpireEventType.EXPIRE,
              date: getVuorovaikutusTilaisuusLinkkiExpirationTime(tilaisuus),
            });
          });
        return schedule;
      }, [] as PublishOrExpireEvent[]) ?? ([] as PublishOrExpireEvent[])
    );
  }

  isAineistoVisible(julkaisu: VuorovaikutusKierrosJulkaisu): boolean {
    const kuulutusPaiva = parseOptionalDate(julkaisu?.vuorovaikutusJulkaisuPaiva);
    let julkinen = false;
    if (kuulutusPaiva?.isBefore(nyt())) {
      julkinen = true;
    }
    // suunnitteluvaiheen aineistot poistuvat kansalaispuolelta, kun nähtävilläolokuulutus julkaistaan
    const kuulutusPaattyyPaiva = this.nahtavillaoloVaiheScheduleManager.getKuulutusPaiva();
    if (kuulutusPaattyyPaiva?.startOf("day").isBefore(nyt())) {
      julkinen = false;
    }
    return julkinen;
  }
}

export class VuorovaikutusKierrosJulkaisuScheduleManager extends VaiheScheduleManager<VuorovaikutusKierrosJulkaisu, unknown> {
  constructor(oid: string, julkaisu: VuorovaikutusKierrosJulkaisu | undefined | null) {
    super(oid, julkaisu, undefined);
  }

  getSchedule(): PublishOrExpireEvent[] {
    // VuorovaikutusKierrosScheduleManager vastuussa tästä
    throw new Error("Not implemented");
  }

  isAineistoVisible(): boolean {
    // VuorovaikutusKierrosAineisto vastuussa tästä
    throw new Error("Not implemented");
  }
}

export class NahtavillaoloVaiheScheduleManager extends VaiheScheduleManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getSchedule(): PublishOrExpireEvent[] {
    const julkaisut = findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisut(julkaisut, "NahtavillaoloVaihe", "NAHTAVILLAOLO");
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

abstract class AbstractHyvaksymisPaatosVaiheScheduleManager extends VaiheScheduleManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {
  isAineistoVisible(julkaisu: HyvaksymisPaatosVaiheJulkaisu): boolean {
    return isVaiheAineistoVisible(julkaisu);
  }
}

export class HyvaksymisPaatosVaiheScheduleManager extends AbstractHyvaksymisPaatosVaiheScheduleManager {
  getSchedule(): PublishOrExpireEvent[] {
    const julkaisut = findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisut(
      julkaisut,
      "HyvaksymisPaatosVaihe",
      "HYVAKSYMISPAATOSVAIHE",
      HYVAKSYMISPAATOS_DURATION
    );
  }
}

export class JatkoPaatos1VaiheScheduleManager extends AbstractHyvaksymisPaatosVaiheScheduleManager {
  getSchedule(): PublishOrExpireEvent[] {
    const julkaisut = findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisut(julkaisut, "JatkoPaatos1Vaihe", "JATKOPAATOS1VAIHE", JATKOPAATOS_DURATION);
  }
}

export class JatkoPaatos2VaiheScheduleManager extends AbstractHyvaksymisPaatosVaiheScheduleManager {
  getSchedule(): PublishOrExpireEvent[] {
    const julkaisut = findJulkaisutWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    return getPublishExpireScheduleForVaiheJulkaisut(julkaisut, "JatkoPaatos2Vaihe", "JATKOPAATOS2VAIHE", JATKOPAATOS_DURATION);
  }
}

function getPublishExpireScheduleForVaiheJulkaisut(
  julkaisut: Pick<NahtavillaoloVaiheJulkaisu & HyvaksymisPaatosVaiheJulkaisu, "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva">[] | undefined,
  description: string,
  vaihe: "NAHTAVILLAOLO" | "HYVAKSYMISPAATOSVAIHE" | "JATKOPAATOS1VAIHE" | "JATKOPAATOS2VAIHE",
  epaAktiivinenDuration?: DateAddTuple
): PublishOrExpireEvent[] {
  return (
    julkaisut?.reduce((events: PublishOrExpireEvent[], julkaisu) => {
      const kuulutusPaiva = parseOptionalDate(julkaisu.kuulutusPaiva);
      if (kuulutusPaiva) {
        events.push({
          reason: description + " kuulutuspäivä",
          type: PublishOrExpireEventType[`PUBLISH_${vaihe}`],
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

        if (epaAktiivinenDuration) {
          events.push({
            reason: description + " muuttuu epäaktiiviseksi",
            type: PublishOrExpireEventType.EXPIRE,
            date: kuulutusVaihePaattyyPaiva.add(epaAktiivinenDuration[0], epaAktiivinenDuration[1]).add(1, "day").startOf("day"),
          });
          events.push({
            reason: description + " muuttuu epäaktiiviseksi kuukauden kuluttua",
            type: PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOS_EPAAKTIVOITUU_KK,
            date: kuulutusVaihePaattyyPaiva.add(epaAktiivinenDuration[0], epaAktiivinenDuration[1]).subtract(1, "month"),
          });
        }
      }
      return events;
    }, [] as PublishOrExpireEvent[]) ?? []
  );
}

function isVaiheAineistoVisible(julkaisu: HyvaksymisPaatosVaiheJulkaisu | NahtavillaoloVaiheJulkaisu) {
  return (
    !!julkaisu &&
    !!julkaisu.kuulutusPaiva &&
    isDateTimeInThePast(julkaisu.kuulutusPaiva, "start-of-day") &&
    !!julkaisu.kuulutusVaihePaattyyPaiva &&
    !isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day")
  );
}

export function getVuorovaikutusTilaisuusLinkkiPublicationTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu): Dayjs {
  return parseDate(tilaisuus.paivamaara + "T" + tilaisuus.alkamisAika).subtract(2, "hours");
}

export function getVuorovaikutusTilaisuusLinkkiExpirationTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu): Dayjs {
  return parseDate(tilaisuus.paivamaara + "T" + tilaisuus.paattymisAika);
}

export function isVerkkotilaisuusLinkkiVisible(julkaisu: VuorovaikutusTilaisuusJulkaisu): boolean {
  const now = nyt();
  return (
    getVuorovaikutusTilaisuusLinkkiPublicationTime(julkaisu).isBefore(now) &&
    getVuorovaikutusTilaisuusLinkkiExpirationTime(julkaisu).isAfter(now)
  );
}
