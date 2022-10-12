import * as API from "../../../../common/graphql/apiModel";
import { isDateInThePast } from "../../util/dateUtil";

export const HYVAKSYMISPAATOS_DURATION_VALUE = 1;
export const HYVAKSYMISPAATOS_DURATION_UNIT = "year";
export const JATKOPAATOS_DURATION_VALUE = 6;
export const JATKOPAATOS_DURATION_UNIT = "months";

// Chain of responsibilites pattern to determine projekti status
export abstract class StatusHandler<T> {
  private nextHandler: StatusHandler<T> | undefined;

  public setNext(handler: StatusHandler<T>): StatusHandler<T> {
    this.nextHandler = handler;
    return handler;
  }

  public handle(p: T): void {
    if (this.nextHandler) {
      this.nextHandler.handle(p);
    }
  }
}

/*
 * Handler to determine if given hyväksymispäätöskuulutusvaihe ended a year or 6 months ago
 */
export abstract class AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<
  T extends API.Projekti | API.ProjektiJulkinen
> extends StatusHandler<T> {
  private isHyvaksymisPaatos: boolean;
  private epaAktiivisuusStatus: API.Status.EPAAKTIIVINEN_1 | API.Status.EPAAKTIIVINEN_2 | API.Status.EPAAKTIIVINEN_3;

  constructor(
    isHyvaksymisPaatos: boolean,
    epaAktiivisuusStatus: API.Status.EPAAKTIIVINEN_1 | API.Status.EPAAKTIIVINEN_2 | API.Status.EPAAKTIIVINEN_3
  ) {
    super();
    this.isHyvaksymisPaatos = isHyvaksymisPaatos;
    this.epaAktiivisuusStatus = epaAktiivisuusStatus;
  }

  abstract getPaatosVaihe(p: T): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined;

  handle(p: T): void {
    const hyvaksymisPaatosVaihe = this.getPaatosVaihe(p);

    // Kuulutusvaiheen päättymisestä pitää olla vuosi
    const kuulutusVaihePaattyyPaiva = hyvaksymisPaatosVaihe?.kuulutusVaihePaattyyPaiva;
    if (kuulutusVaihePaattyyPaiva) {
      let hyvaksymisPaatosKuulutusPaattyyInThePast: boolean;
      if (this.isHyvaksymisPaatos) {
        hyvaksymisPaatosKuulutusPaattyyInThePast = isDateInThePast(
          kuulutusVaihePaattyyPaiva,
          HYVAKSYMISPAATOS_DURATION_VALUE,
          HYVAKSYMISPAATOS_DURATION_UNIT
        );
      } else {
        hyvaksymisPaatosKuulutusPaattyyInThePast = isDateInThePast(
          kuulutusVaihePaattyyPaiva,
          JATKOPAATOS_DURATION_VALUE,
          JATKOPAATOS_DURATION_UNIT
        );
      }

      if (hyvaksymisPaatosKuulutusPaattyyInThePast) {
        p.status = this.epaAktiivisuusStatus;
      }
      super.handle(p); // Continue evaluating next rules
    }
  }
}
