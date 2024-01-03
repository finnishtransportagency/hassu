import * as API from "hassu-common/graphql/apiModel";
import { KuulutusJulkaisuTila, Status } from "hassu-common/graphql/apiModel";
import { isDateTimeInThePast } from "../../util/dateUtil";
import { AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler, HyvaksymisPaatosJulkaisuEndDateAndTila, StatusHandler } from "./statusHandler";

export function isKuulutusPaivaInThePast(kuulutusPaiva?: string | null): boolean {
  return !!kuulutusPaiva && isDateTimeInThePast(kuulutusPaiva, "start-of-day");
}

export function isKuulutusVaihePaattyyPaivaInThePast(kuulutusVaihePaattyyPaiva: string | null | undefined): boolean {
  return !!kuulutusVaihePaattyyPaiva && isDateTimeInThePast(kuulutusVaihePaattyyPaiva, "end-of-day");
}

export function applyProjektiJulkinenStatus(projekti: API.ProjektiJulkinen): void {
  const aloituskuulutus = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const julkaisu = projekti.aloitusKuulutusJulkaisu;
      if (julkaisu) {
        if (julkaisu.tila == KuulutusJulkaisuTila.MIGROITU) {
          // No status change, but continue searching for actual published content
          super.handle(p);
        } else if (isKuulutusPaivaInThePast(julkaisu.kuulutusPaiva)) {
          projekti.status = API.Status.ALOITUSKUULUTUS;
          super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const suunnittelu = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      if (projekti.vuorovaikutukset) {
        const tila = projekti.vuorovaikutukset.tila;
        if (tila === API.VuorovaikutusKierrosTila.JULKINEN) {
          projekti.status = API.Status.SUUNNITTELU;
          super.handle(p); // Continue evaluating next rules
        } else if (tila === API.VuorovaikutusKierrosTila.MIGROITU) {
          super.handle(p);
        }
      }
      if (projekti.vahainenMenettely) {
        super.handle(p);
      }
    }
  })();

  const nahtavillaOlo = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      if (projekti.nahtavillaoloVaihe?.tila == KuulutusJulkaisuTila.MIGROITU) {
        super.handle(p); // Continue evaluating next rules
      } else {
        const kuulutusPaiva = projekti.nahtavillaoloVaihe?.kuulutusPaiva;
        if (kuulutusPaiva && isDateTimeInThePast(kuulutusPaiva, "start-of-day")) {
          projekti.status = API.Status.NAHTAVILLAOLO;
          super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
      if (nahtavillaoloVaihe?.tila == KuulutusJulkaisuTila.MIGROITU) {
        super.handle(p); // Continue evaluating next rules
      } else if (isKuulutusVaihePaattyyPaivaInThePast(nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva)) {
        projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksytty = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
      if (hyvaksymisPaatosVaihe?.tila == KuulutusJulkaisuTila.MIGROITU) {
        super.handle(p); // Continue evaluating next rules
      } else if (hyvaksymisPaatosVaihe?.kuulutusPaiva && isDateTimeInThePast(hyvaksymisPaatosVaihe.kuulutusPaiva, "start-of-day")) {
        projekti.status = API.Status.HYVAKSYTTY;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  type PaatosEndDateAndTila = HyvaksymisPaatosJulkaisuEndDateAndTila | null | undefined;

  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): PaatosEndDateAndTila {
      return p.hyvaksymisPaatosVaihe;
    }
  })(true, API.Status.EPAAKTIIVINEN_1);

  const jatkoPaatos1 = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const jatkoPaatos1Vaihe = projekti.jatkoPaatos1Vaihe;
      if (jatkoPaatos1Vaihe?.kuulutusPaiva && isDateTimeInThePast(jatkoPaatos1Vaihe.kuulutusPaiva, "start-of-day")) {
        projekti.status = API.Status.JATKOPAATOS_1;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen2 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): PaatosEndDateAndTila {
      return p.jatkoPaatos1Vaihe;
    }
  })(false, Status.EPAAKTIIVINEN_2);

  const jatkoPaatos2 = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const jatkoPaatos2Vaihe = projekti.jatkoPaatos2Vaihe;
      if (jatkoPaatos2Vaihe?.kuulutusPaiva && isDateTimeInThePast(jatkoPaatos2Vaihe.kuulutusPaiva, "start-of-day")) {
        projekti.status = API.Status.JATKOPAATOS_2;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen3 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): PaatosEndDateAndTila {
      return p.jatkoPaatos2Vaihe;
    }
  })(false, Status.EPAAKTIIVINEN_3);

  projekti.status = API.Status.EI_JULKAISTU;
  aloituskuulutus
    .setNext(suunnittelu)
    .setNext(nahtavillaOlo)
    .setNext(hyvaksymisMenettelyssa)
    .setNext(hyvaksytty)
    .setNext(epaAktiivinen1)
    .setNext(jatkoPaatos1)
    .setNext(epaAktiivinen2)
    .setNext(jatkoPaatos2)
    .setNext(epaAktiivinen3);

  aloituskuulutus.handle(projekti);
}
