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

export async function applyProjektiJulkinenStatus(projekti: API.ProjektiJulkinen): Promise<void> {
  const aloituskuulutus = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      const julkaisu = projekti.aloitusKuulutusJulkaisu;
      if (julkaisu) {
        if (julkaisu.tila == KuulutusJulkaisuTila.MIGROITU) {
          // No status change, but continue searching for actual published content
          await super.handle(p);
        } else if (isKuulutusPaivaInThePast(julkaisu.kuulutusPaiva)) {
          projekti.status = API.Status.ALOITUSKUULUTUS;
          await super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const suunnittelu = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      if (projekti.vuorovaikutukset) {
        const tila = projekti.vuorovaikutukset.tila;
        if (tila === API.VuorovaikutusKierrosTila.JULKINEN) {
          projekti.status = API.Status.SUUNNITTELU;
          await super.handle(p); // Continue evaluating next rules
        } else if (tila === API.VuorovaikutusKierrosTila.MIGROITU) {
          await super.handle(p);
        }
      }
      if (projekti.vahainenMenettely) {
        await super.handle(p);
      }
    }
  })();

  const nahtavillaOlo = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      if (projekti.nahtavillaoloVaihe?.tila == KuulutusJulkaisuTila.MIGROITU) {
        await super.handle(p); // Continue evaluating next rules
      } else {
        const kuulutusPaiva = projekti.nahtavillaoloVaihe?.kuulutusPaiva;
        if (kuulutusPaiva && isDateTimeInThePast(kuulutusPaiva, "start-of-day")) {
          projekti.status = API.Status.NAHTAVILLAOLO;
          await super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
      if (nahtavillaoloVaihe?.tila == KuulutusJulkaisuTila.MIGROITU) {
        await super.handle(p); // Continue evaluating next rules
      } else {
        if (isKuulutusVaihePaattyyPaivaInThePast(nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva)) {
          projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
          await super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const hyvaksytty = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
      if (hyvaksymisPaatosVaihe?.tila == KuulutusJulkaisuTila.MIGROITU) {
        await super.handle(p); // Continue evaluating next rules
      } else {
        if (hyvaksymisPaatosVaihe?.kuulutusPaiva && isDateTimeInThePast(hyvaksymisPaatosVaihe.kuulutusPaiva, "start-of-day")) {
          projekti.status = API.Status.HYVAKSYTTY;
          await super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): HyvaksymisPaatosJulkaisuEndDateAndTila | null | undefined {
      return p.hyvaksymisPaatosVaihe;
    }
  })(true, API.Status.EPAAKTIIVINEN_1);

  const jatkoPaatos1 = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      const jatkoPaatos1Vaihe = projekti.jatkoPaatos1Vaihe;
      if (jatkoPaatos1Vaihe?.kuulutusPaiva && isDateTimeInThePast(jatkoPaatos1Vaihe.kuulutusPaiva, "start-of-day")) {
        projekti.status = API.Status.JATKOPAATOS_1;
        await super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen2 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): HyvaksymisPaatosJulkaisuEndDateAndTila | null | undefined {
      return p.jatkoPaatos1Vaihe;
    }
  })(false, Status.EPAAKTIIVINEN_2);

  const jatkoPaatos2 = new (class extends StatusHandler<API.ProjektiJulkinen> {
    async handle(p: API.ProjektiJulkinen) {
      const jatkoPaatos2Vaihe = projekti.jatkoPaatos2Vaihe;
      if (jatkoPaatos2Vaihe?.kuulutusPaiva && isDateTimeInThePast(jatkoPaatos2Vaihe.kuulutusPaiva, "start-of-day")) {
        projekti.status = API.Status.JATKOPAATOS_2;
        await super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen3 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): HyvaksymisPaatosJulkaisuEndDateAndTila | null | undefined {
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

  await aloituskuulutus.handle(projekti);
}
