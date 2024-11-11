import * as API from "hassu-common/graphql/apiModel";
import { KuulutusJulkaisuTila, Status } from "hassu-common/graphql/apiModel";
import { isDateTimeInThePast } from "../../util/dateUtil";
import { AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler, HyvaksymisPaatosJulkaisuEndDateAndTila, StatusHandler } from "./statusHandler";

export function isKuulutusVaihePaattyyPaivaInThePast(kuulutusVaihePaattyyPaiva: string | null | undefined): boolean {
  return !!kuulutusVaihePaattyyPaiva && isDateTimeInThePast(kuulutusVaihePaattyyPaiva, "end-of-day");
}

type KuulutusJulkaisuAvain = keyof Pick<
  API.ProjektiJulkinen,
  "aloitusKuulutusJulkaisu" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

abstract class KuulutusStatusHandler extends StatusHandler<API.ProjektiJulkinen> {
  protected vaiheAvain: KuulutusJulkaisuAvain;
  protected status: API.Status;

  constructor(status: API.Status, vaiheAvain: KuulutusJulkaisuAvain) {
    super();
    this.status = status;
    this.vaiheAvain = vaiheAvain;
  }

  handle(p: API.ProjektiJulkinen) {
    const kuulutus = p[this.vaiheAvain];
    if (kuulutus?.tila === KuulutusJulkaisuTila.MIGROITU || kuulutus?.kopioituToiseltaProjektilta) {
      super.handle(p); // Continue evaluating next rules
    } else if (kuulutus?.kuulutusPaiva && isDateTimeInThePast(kuulutus.kuulutusPaiva, "start-of-day")) {
      p.status = this.status;
      super.handle(p);
    }
  }
}

export function applyProjektiJulkinenStatus(projekti: API.ProjektiJulkinen): void {
  const aloituskuulutus = new (class extends KuulutusStatusHandler {})(API.Status.ALOITUSKUULUTUS, "aloitusKuulutusJulkaisu");

  const suunnittelu = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      if (projekti.vuorovaikutukset) {
        const tila = projekti.vuorovaikutukset.tila;
        if (tila === API.VuorovaikutusKierrosTila.JULKINEN && !projekti.vuorovaikutukset.kopioituToiseltaProjektilta) {
          projekti.status = API.Status.SUUNNITTELU;
          super.handle(p); // Continue evaluating next rules
        } else if (tila === API.VuorovaikutusKierrosTila.JULKINEN) {
          super.handle(p);
        } else if (tila === API.VuorovaikutusKierrosTila.MIGROITU) {
          super.handle(p);
        }
      }
      if (projekti.vahainenMenettely) {
        super.handle(p);
      }
    }
  })();

  const nahtavillaOlo = new (class extends KuulutusStatusHandler {})(API.Status.NAHTAVILLAOLO, "nahtavillaoloVaihe");

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
      if (nahtavillaoloVaihe?.tila === KuulutusJulkaisuTila.MIGROITU || nahtavillaoloVaihe?.kopioituToiseltaProjektilta) {
        super.handle(p); // Continue evaluating next rules
      } else if (isKuulutusVaihePaattyyPaivaInThePast(nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva)) {
        projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksytty = new (class extends KuulutusStatusHandler {})(API.Status.HYVAKSYTTY, "hyvaksymisPaatosVaihe");

  type PaatosEndDateAndTila = HyvaksymisPaatosJulkaisuEndDateAndTila | null | undefined;

  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): PaatosEndDateAndTila {
      return p.hyvaksymisPaatosVaihe;
    }
  })(true, API.Status.EPAAKTIIVINEN_1);

  const jatkoPaatos1 = new (class extends KuulutusStatusHandler {})(API.Status.JATKOPAATOS_1, "jatkoPaatos1Vaihe");

  const epaAktiivinen2 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): PaatosEndDateAndTila {
      return p.jatkoPaatos1Vaihe;
    }
  })(false, Status.EPAAKTIIVINEN_2);

  const jatkoPaatos2 = new (class extends KuulutusStatusHandler {})(API.Status.JATKOPAATOS_2, "jatkoPaatos2Vaihe");

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
