import * as API from "../../../../common/graphql/apiModel";
import { HyvaksymisPaatosVaiheTila, NahtavillaoloVaiheTila } from "../../../../common/graphql/apiModel";
import { kayttoOikeudetSchema } from "../../../../src/schemas/kayttoOikeudet";
import { ValidationError } from "yup";
import { log } from "../../logger";
import { perustiedotValidationSchema } from "../../../../src/schemas/perustiedot";
import { findJulkaisutWithTila, findJulkaisuWithTila } from "../projektiUtil";
import { AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler, StatusHandler } from "./statusHandler";
import { isDateInThePast } from "../../util/dateUtil";

export function applyProjektiStatus(projekti: API.Projekti): void {
  const perustiedot = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      // Initial state
      p.tallennettu = true;
      p.status = API.Status.EI_JULKAISTU;

      try {
        kayttoOikeudetSchema.validateSync(p.kayttoOikeudet);
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Käyttöoikeudet puutteelliset", e);
          p.status = API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT;
          return; // This is the final status
        } else {
          throw e;
        }
      }
      try {
        perustiedotValidationSchema.validateSync(p);
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Perustiedot puutteelliset", e.errors);
          return; // This is the final status
        } else {
          throw e;
        }
      }

      if (!p.aloitusKuulutus) {
        p.aloitusKuulutus = { __typename: "AloitusKuulutus" };
      }
      p.status = API.Status.ALOITUSKUULUTUS;
      super.handle(p); // Continue evaluating next rules
    }
  })();

  const suunnittelu = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      if (p.aloitusKuulutusJulkaisut) {
        p.status = API.Status.SUUNNITTELU;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const nahtavillaOlo = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      if (p.suunnitteluVaihe?.julkinen) {
        p.status = API.Status.NAHTAVILLAOLO;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      const nahtavillaoloVaihe = findJulkaisuWithTila(p.nahtavillaoloVaiheJulkaisut, NahtavillaoloVaiheTila.HYVAKSYTTY);
      const nahtavillaoloKuulutusPaattyyInThePast =
        nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva && isDateInThePast(nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva);

      if (nahtavillaoloKuulutusPaattyyInThePast) {
        p.status = API.Status.HYVAKSYMISMENETTELYSSA;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksytty = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      const hyvaksymisPaatos = p.kasittelynTila?.hyvaksymispaatos;
      const hasHyvaksymisPaatos = hyvaksymisPaatos?.asianumero && hyvaksymisPaatos?.paatoksenPvm;

      const nahtavillaoloVaihe = findJulkaisuWithTila(p.nahtavillaoloVaiheJulkaisut, NahtavillaoloVaiheTila.HYVAKSYTTY);
      const nahtavillaoloKuulutusPaattyyInThePast =
        nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva && isDateInThePast(nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva);

      if (hasHyvaksymisPaatos && nahtavillaoloKuulutusPaattyyInThePast) {
        p.status = API.Status.HYVAKSYTTY;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  /**
   * Jos hyväksymispäätöskuulutuksen päättymispäivästä on kulunut vuosi, niin tila on epäaktiivinen
   */
  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.Projekti> {
    getPaatosVaihe(p: API.Projekti): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return findJulkaisutWithTila(p.hyvaksymisPaatosVaiheJulkaisut, HyvaksymisPaatosVaiheTila.HYVAKSYTTY)?.pop();
    }
  })(true);

  /**
   * Ensimmäisen jatkopäätöksen päivämäärä ja asiatunnus annettu
   */
  const jatkoPaatos1 = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      const jatkoPaatos = p.kasittelynTila?.ensimmainenJatkopaatos;
      if (jatkoPaatos && jatkoPaatos.asianumero && jatkoPaatos.paatoksenPvm) {
        p.status = API.Status.JATKOPAATOS_1;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  /**
   * Jos jatkopäätöksen kuulutuksen päättymispäivästä on 6kk, niin tila on epäaktiivinen
   */
  const epaAktiivinen2 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.Projekti> {
    getPaatosVaihe(p: API.Projekti): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return findJulkaisutWithTila(p.jatkoPaatos1VaiheJulkaisut, HyvaksymisPaatosVaiheTila.HYVAKSYTTY)?.pop();
    }
  })(false);

  /**
   * Ensimmäisen jatkopäätöksen päivämäärä ja asiatunnus annettu
   */
  const jatkoPaatos2 = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      const jatkoPaatos = p.kasittelynTila?.toinenJatkopaatos;
      if (jatkoPaatos && jatkoPaatos.asianumero && jatkoPaatos.paatoksenPvm) {
        p.status = API.Status.JATKOPAATOS_2;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  /**
   * Jos toisen jatkopäätöksen kuulutuksen päättymispäivästä on 6kk, niin tila on epäaktiivinen
   */
  const epaAktiivinen3 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.Projekti> {
    getPaatosVaihe(p: API.Projekti): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return findJulkaisutWithTila(p.jatkoPaatos2VaiheJulkaisut, HyvaksymisPaatosVaiheTila.HYVAKSYTTY)?.pop();
    }
  })(false);

  perustiedot
    .setNext(suunnittelu)
    .setNext(nahtavillaOlo)
    .setNext(hyvaksymisMenettelyssa)
    .setNext(hyvaksytty)
    .setNext(epaAktiivinen1)
    .setNext(jatkoPaatos1)
    .setNext(epaAktiivinen2)
    .setNext(jatkoPaatos2)
    .setNext(epaAktiivinen3);
  perustiedot.handle(projekti);
}
