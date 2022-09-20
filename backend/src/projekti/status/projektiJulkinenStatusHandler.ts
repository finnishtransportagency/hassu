import * as API from "../../../../common/graphql/apiModel";
import { isDateInThePast, parseDate } from "../../util/dateUtil";
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
      if (kuulutusPaiva && parseDate(kuulutusPaiva).isBefore(dayjs())) {
        projekti.status = API.Status.NAHTAVILLAOLO;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
      if (isDateInThePast(nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva)) {
        projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksytty = new (class extends StatusHandler<API.ProjektiJulkinen> {
    handle(p: API.ProjektiJulkinen) {
      const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
      if (isDateInThePast(hyvaksymisPaatosVaihe?.kuulutusPaiva)) {
        projekti.status = API.Status.HYVAKSYTTY;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.ProjektiJulkinen> {
    getPaatosVaihe(p: API.ProjektiJulkinen): { kuulutusVaihePaattyyPaiva?: string | null } {
      return p.hyvaksymisPaatosVaihe;
    }
  })(true);

  projekti.status = API.Status.EI_JULKAISTU;
  aloituskuulutus.setNext(suunnittelu).setNext(nahtavillaOlo).setNext(hyvaksymisMenettelyssa).setNext(hyvaksytty).setNext(epaAktiivinen1);

  aloituskuulutus.handle(projekti);
}
