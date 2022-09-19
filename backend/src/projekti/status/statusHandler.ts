import * as API from "../../../../common/graphql/apiModel";
import { isDateInThePast } from "../../util/dateUtil";

export const HYVAKSYMISPAATOS_DURATION_VALUE = 1;
export const HYVAKSYMISPAATOS_DURATION_UNIT = "year";
export const JATKOPAATOS_DURATION_VALUE = 1;
export const JATKOPAATOS_DURATION_UNIT = "year";

// Chain of responsibilites pattern to determine projekti status
export abstract class StatusHandler<T> {
  private nextHandler: StatusHandler<T>;

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

  constructor(isHyvaksymisPaatos: boolean) {
    super();
    this.isHyvaksymisPaatos = isHyvaksymisPaatos;
  }

  abstract getPaatosVaihe(p: T): { kuulutusVaihePaattyyPaiva?: string | null };

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
        p.status = API.Status.EPAAKTIIVINEN;
      }
      super.handle(p); // Continue evaluating next rules
    }
  }
}
