import { TestiKomentoInput, TestiKomentoVaihe } from "hassu-common/graphql/apiModel";
import dayjs from "dayjs";
import { DBProjekti } from "../database/model";
import {
  DATE_TIME_FORMAT,
  FULL_DATE_TIME_FORMAT,
  FULL_DATE_TIME_FORMAT_WITH_TZ,
  ISO_DATE_FORMAT,
  parseOptionalDate,
} from "../util/dateUtil";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { log } from "../logger";
import { projektiSchedulerService } from "../sqsEvents/projektiSchedulerService";
import { HYVAKSYMISPAATOS_VAIHE_PAATTYY, PublishOrExpireEventType } from "../sqsEvents/projektiScheduleManager";

class DateMoverTool {
  async ajansiirto(params: Pick<TestiKomentoInput, "oid" | "vaihe" | "ajansiirtoPaivina">) {
    const projekti = await testProjektiDatabase.loadProjektiByOid(params.oid);
    if (!projekti) {
      throw new Error("Projektia ei löydy.");
    }

    log.info("Siirretään projektin aikaa", { params });

    let deltaInDays = 0;
    // Jos params.ajansiirtoPaivina on annettu ilman params.vaihetta, käytetään ajansiirtoPaivina lukua sinänsä.
    if (params.ajansiirtoPaivina && !params.vaihe) {
      deltaInDays = params.ajansiirtoPaivina;
    } else if (params.ajansiirtoPaivina && params.vaihe) {
      // Jos params.ajansiirtoPaivina ja params.vaihe on molemmat annettu, siirretään annetun vaiheen maksimipäivää params.ajansiirtoPaivina päivää nykyhetkestä menneisyyteen.
      const deltaCalculator = this.getDeltaCalculator(projekti, params.vaihe);
      deltaInDays = deltaCalculator.getDaysToMove(params.ajansiirtoPaivina);
    }
    if (deltaInDays !== 0) {
      siirraProjektinAikaa(projekti, deltaInDays);
      await testProjektiDatabase.saveProjekti(projekti);
      const sendTraficomMessage = params.vaihe === TestiKomentoVaihe.HYVAKSYMISVAIHE;
      await projektiSchedulerService.synchronizeProjektiFiles(params.oid, PublishOrExpireEventType.EXPIRE, sendTraficomMessage ? HYVAKSYMISPAATOS_VAIHE_PAATTYY : undefined);
    }
  }

  getDeltaCalculator(projekti: DBProjekti, vaihe: TestiKomentoVaihe) {
    switch (vaihe) {
      case TestiKomentoVaihe.ALOITUSKUULUTUS:
        throw new Error("Ei toteutettu");
      case TestiKomentoVaihe.VUOROVAIKUTUKSET:
        return this.getMaxDateFromVuorovaikutukset(projekti);
      case TestiKomentoVaihe.NAHTAVILLAOLO:
        return this.getMaxDateFromNahtavillaolo(projekti);
      case TestiKomentoVaihe.HYVAKSYMISVAIHE:
        return this.getMaxDateFromHyvaksymisPaatos(projekti);
      case TestiKomentoVaihe.JATKOPAATOS1VAIHE:
        return this.getMaxDateFromJatkopaatos1(projekti);
      case TestiKomentoVaihe.JATKOPAATOS2VAIHE:
        return this.getMaxDateFromJatkopaatos2(projekti);
    }
    throw new Error("Ei toteutettu");
  }

  // max vuorovaikutustilaisuus.paivamaara -1 päivä
  getMaxDateFromVuorovaikutukset(projekti: DBProjekti) {
    const maxDate = new DateDeltaCalculator();
    for (const julkaisu of projekti?.vuorovaikutusKierrosJulkaisut ?? []) {
      julkaisu.vuorovaikutusTilaisuudet?.forEach((tilaisuus) => {
        maxDate.addDate(tilaisuus.paivamaara);
      });
    }
    return maxDate;
  }

  getMaxDateFromNahtavillaolo(projekti: DBProjekti) {
    const maxDate = new DateDeltaCalculator();
    for (const julkaisu of projekti.nahtavillaoloVaiheJulkaisut ?? []) {
      maxDate.addDate(julkaisu.kuulutusVaihePaattyyPaiva);
    }
    return maxDate;
  }

  getMaxDateFromHyvaksymisPaatos(projekti: DBProjekti) {
    const maxDate = new DateDeltaCalculator();
    for (const julkaisu of projekti?.hyvaksymisPaatosVaiheJulkaisut ?? []) {
      maxDate.addDate(julkaisu.kuulutusPaiva);
      maxDate.addDate(julkaisu.kuulutusVaihePaattyyPaiva);
    }
    return maxDate;
  }

  getMaxDateFromJatkopaatos1(projekti: DBProjekti) {
    const maxDate = new DateDeltaCalculator();
    for (const julkaisu of projekti?.jatkoPaatos1VaiheJulkaisut ?? []) {
      maxDate.addDate(julkaisu.kuulutusPaiva);
      maxDate.addDate(julkaisu.kuulutusVaihePaattyyPaiva);
    }
    return maxDate;
  }

  getMaxDateFromJatkopaatos2(projekti: DBProjekti) {
    const maxDate = new DateDeltaCalculator();
    for (const julkaisu of projekti?.jatkoPaatos2VaiheJulkaisut ?? []) {
      maxDate.addDate(julkaisu.kuulutusPaiva);
      maxDate.addDate(julkaisu.kuulutusVaihePaattyyPaiva);
    }
    return maxDate;
  }
}

/**
 * Apuluokka, jonne syötetään päivämääriä. Päivämääristä valitaan myöhäisin. Lopulta lasketaan montako päivää tämä on nykyhetkestä.
 */
class DateDeltaCalculator {
  private latestDate: dayjs.Dayjs | undefined;

  addDate(date: string | undefined | null) {
    if (!date) {
      return;
    }
    const dayjsDate = dayjs(date);
    if (!this.latestDate || dayjsDate.isAfter(this.latestDate)) {
      this.latestDate = dayjsDate;
    }
  }

  getDaysToMove(daysToPast: number) {
    if (!this.latestDate) {
      return 0;
    }
    const number = -dayjs()
      .subtract(daysToPast + 1, "day")
      .diff(this.latestDate, "day");
    log.info("Laskennan tulos: latestDate=" + this.latestDate.toISOString() + " daysToMove=" + number + " daysToPast=" + daysToPast);
    return number;
  }
}

export function siirraProjektinAikaa(projekti: DBProjekti, numberOfDaysToMoveToPast: number) {
  modifyDateFieldsByName(projekti, numberOfDaysToMoveToPast);
}

function modifyDateFieldsByName(obj: Record<string, unknown>, numberOfDaysToMoveToPast: number): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null && !(obj[prop] instanceof Buffer)) {
      modifyDateFieldsByName(obj[prop] as Record<string, unknown>, numberOfDaysToMoveToPast);
    } else {
      const value = obj[prop];
      if (typeof value == "string") {
        const oldStr = obj[prop] as string;
        // Jos merkkijono alkaa numerolla jonka jälkeen on väliviiva ja numero, niin yritetään parsia päivämäärä
        if (oldStr.search(/^\d+-\d+/) !== -1 && dayjs(oldStr).isValid()) {
          let old = parseOptionalDate(oldStr);
          if (old) {
            old = old.subtract(numberOfDaysToMoveToPast, "day");
            if (oldStr.length == ISO_DATE_FORMAT.length) {
              obj[prop] = old.format(ISO_DATE_FORMAT);
            } else if (oldStr.length == DATE_TIME_FORMAT.length) {
              obj[prop] = old.format(DATE_TIME_FORMAT);
            } else if (oldStr.length == FULL_DATE_TIME_FORMAT.length) {
              obj[prop] = old.format(FULL_DATE_TIME_FORMAT);
            } else if (oldStr.length > FULL_DATE_TIME_FORMAT.length) {
              obj[prop] = old.format(FULL_DATE_TIME_FORMAT_WITH_TZ);
            }
          }
        }
      }
    }
  });
}

export const dateMoverTool = new DateMoverTool();
