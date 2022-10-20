import * as API from "../../../../common/graphql/apiModel";
import { Status } from "../../../../common/graphql/apiModel";
import { isDateTimeInThePast, parseDate } from "../../util/dateUtil";
import dayjs from "dayjs";
import { AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler, StatusHandler } from "./statusHandler";

export function applyProjektiJulkinenStatus(projekti: API.ProjektiJulkinen): void {
  const aloituskuulutus = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      if (projekti.aloitusKuulutusJulkaisut) {
        const julkisetAloituskuulutukset = projekti.aloitusKuulutusJulkaisut.filter((julkaisu) => {
          return julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(dayjs());
        });

        if (julkisetAloituskuulutukset?.length > 0) {
          projekti.status = API.Status.ALOITUSKUULUTUS;
          super.handle(p); // Continue evaluating next rules
        }
      }
    }
  })();

  const suunnittelu = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      if (projekti.suunnitteluVaihe) {
        projekti.status = API.Status.SUUNNITTELU;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const nahtavillaOlo = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const kuulutusPaiva = projekti.nahtavillaoloVaihe?.kuulutusPaiva;
      if (kuulutusPaiva && isDateTimeInThePast(kuulutusPaiva)) {
        projekti.status = API.Status.NAHTAVILLAOLO;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
      if (nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva && isDateTimeInThePast(nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva)) {
        projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksytty = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
      if (hyvaksymisPaatosVaihe?.kuulutusPaiva && isDateTimeInThePast(hyvaksymisPaatosVaihe.kuulutusPaiva)) {
        projekti.status = API.Status.HYVAKSYTTY;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return p.hyvaksymisPaatosVaihe;
    }
  })(true, API.Status.EPAAKTIIVINEN_1);

  const jatkoPaatos1 = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const jatkoPaatos1Vaihe = projekti.jatkoPaatos1Vaihe;
      if (jatkoPaatos1Vaihe?.kuulutusPaiva && isDateTimeInThePast(jatkoPaatos1Vaihe.kuulutusPaiva)) {
        projekti.status = API.Status.JATKOPAATOS_1;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen2 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return p.jatkoPaatos1Vaihe;
    }
  })(false, Status.EPAAKTIIVINEN_2);

  const jatkoPaatos2 = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const jatkoPaatos2Vaihe = projekti.jatkoPaatos2Vaihe;
      if (jatkoPaatos2Vaihe?.kuulutusPaiva && isDateTimeInThePast(jatkoPaatos2Vaihe.kuulutusPaiva)) {
        projekti.status = API.Status.JATKOPAATOS_2;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen3 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
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
