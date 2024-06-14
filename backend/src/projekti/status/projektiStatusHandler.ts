import * as API from "hassu-common/graphql/apiModel";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { KuulutusJulkaisuTila, MuokkausTila, Status, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import { kayttoOikeudetSchema } from "../../../../src/schemas/kayttoOikeudet";
import { ValidationError } from "yup";
import { log } from "../../logger";
import { perustiedotValidationSchema } from "../../../../src/schemas/perustiedot";
import { GenericApiKuulutusJulkaisu } from "../projektiUtil";
import { AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler, HyvaksymisPaatosJulkaisuEndDateAndTila, StatusHandler } from "./statusHandler";
import { isDateTimeInThePast } from "../../util/dateUtil";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { ValidateOptions } from "yup/lib/types";
import { cloneDeep } from "lodash";

function isJulkaisuMigroituOrHyvaksyttyAndInPast<T extends GenericApiKuulutusJulkaisu>(julkaisu: T | null | undefined): boolean {
  const julkaisuMigratoitu = julkaisu?.tila === KuulutusJulkaisuTila.MIGROITU;
  const julkaisuHyvaksytty = julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY;
  const kuulutusVaihePaattyyInPast = julkaisu?.kuulutusVaihePaattyyPaiva
    ? isDateTimeInThePast(julkaisu.kuulutusVaihePaattyyPaiva, "end-of-day")
    : false;

  return julkaisuMigratoitu || (julkaisuHyvaksytty && !!kuulutusVaihePaattyyInPast);
}

function doesAineistoNahtavillaContainKategorisoidutAineistot(aineistoNahtavilla?: API.Aineisto[] | null | undefined): boolean {
  // Check if aineistoNahtavilla
  // -- contains aineisto
  // -- does not contain aineisto with kategorisoimattomat category.
  return (
    !!aineistoNahtavilla?.length &&
    !aineistoNahtavilla.some((aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId)
  );
}

function getHyvaksyttyHyvaksymisPaatosJulkaisu(julkaisu: API.HyvaksymisPaatosVaiheJulkaisu | null | undefined) {
  const julkaisuMigroituOrHyvaksytty =
    julkaisu?.tila === KuulutusJulkaisuTila.HYVAKSYTTY || julkaisu?.tila === KuulutusJulkaisuTila.MIGROITU;

  if (!julkaisuMigroituOrHyvaksytty) {
    return undefined;
  }
  return julkaisu;
}

export function applyProjektiStatus(projekti: API.Projekti): void {
  const perustiedot = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      // Initial state

      const projektiLisatiedolla: ProjektiLisatiedolla = {
        ...cloneDeep(p),
        tallennettu: true,
        nykyinenKayttaja: { omaaMuokkausOikeuden: true, onProjektipaallikkoTaiVarahenkilo: true, onYllapitaja: true },
      };

      const testContext: ValidateOptions<ProjektiValidationContext> = {
        context: {
          projekti: projektiLisatiedolla,
          isRuotsinkielinenProjekti: {
            current: [p.kielitiedot?.ensisijainenKieli, p.kielitiedot?.toissijainenKieli].includes(API.Kieli.RUOTSI),
          },
          hasEuRahoitus: { current: !!p.euRahoitus },
        },
      };

      p.status = API.Status.EI_JULKAISTU;
      try {
        kayttoOikeudetSchema.validateSync(p.kayttoOikeudet, testContext);
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Käyttöoikeudet puutteelliset", e.message);
          p.status = API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT;
          return; // This is the final status
        } else {
          throw e;
        }
      }
      try {
        perustiedotValidationSchema.validateSync(p, testContext);
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Perustiedot puutteelliset", { e });
          return; // This is the final status
        } else {
          throw e;
        }
      }

      if (!p.aloitusKuulutus && !p.aloitusKuulutusJulkaisu) {
        p.aloitusKuulutus = { __typename: "AloitusKuulutus", muokkausTila: MuokkausTila.MUOKKAUS };
      }
      p.status = API.Status.ALOITUSKUULUTUS;
      super.handle(p); // Continue evaluating next rules
    }
  })();

  const suunnittelu = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      if (p.vahainenMenettely) {
        super.handle(p); // Continue evaluating next rules
      } else if (p.aloitusKuulutusJulkaisu) {
        p.status = API.Status.SUUNNITTELU;
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const nahtavillaOlo = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      if (
        p.vuorovaikutusKierros?.tila == VuorovaikutusKierrosTila.MIGROITU ||
        p.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.JULKINEN ||
        (p.vahainenMenettely && p.aloitusKuulutusJulkaisu)
      ) {
        if (!p.nahtavillaoloVaihe && !p.nahtavillaoloVaiheJulkaisu) {
          p.nahtavillaoloVaihe = { __typename: "NahtavillaoloVaihe", muokkausTila: MuokkausTila.MUOKKAUS };
        }
        p.status = API.Status.NAHTAVILLAOLO_AINEISTOT;

        if (
          p.nahtavillaoloVaiheJulkaisu ||
          doesAineistoNahtavillaContainKategorisoidutAineistot(p.nahtavillaoloVaihe?.aineistoNahtavilla)
        ) {
          p.status = API.Status.NAHTAVILLAOLO;
        }
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  const hyvaksymisMenettelyssa = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      if (isJulkaisuMigroituOrHyvaksyttyAndInPast(p.nahtavillaoloVaiheJulkaisu)) {
        p.status = API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT;
        if (!p.hyvaksymisPaatosVaihe && !p.hyvaksymisPaatosVaiheJulkaisu) {
          p.hyvaksymisPaatosVaihe = { __typename: "HyvaksymisPaatosVaihe", muokkausTila: MuokkausTila.MUOKKAUS }; // TODO: Lisää tämä muualle!!!
        }
        const hasRequiredAineistot =
          doesAineistoNahtavillaContainKategorisoidutAineistot(p.hyvaksymisPaatosVaihe?.aineistoNahtavilla) &&
          !!p.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.length;
        if (hasRequiredAineistot) {
          p.status = API.Status.HYVAKSYMISMENETTELYSSA;
          const hyvaksymisPaatos = p.kasittelynTila?.hyvaksymispaatos;
          const hasHyvaksymisPaatos = hyvaksymisPaatos?.asianumero && hyvaksymisPaatos?.paatoksenPvm;
          if (hasHyvaksymisPaatos && isJulkaisuMigroituOrHyvaksyttyAndInPast(p.nahtavillaoloVaiheJulkaisu)) {
            p.status = API.Status.HYVAKSYTTY;
          }
        }
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  /**
   * Jos hyväksymispäätöskuulutuksen päättymispäivästä on kulunut vuosi, niin tila on epäaktiivinen
   */
  const epaAktiivinen1 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.Projekti> {
    getPaatosVaihe(p: API.Projekti): HyvaksymisPaatosJulkaisuEndDateAndTila | null | undefined {
      return getHyvaksyttyHyvaksymisPaatosJulkaisu(p.hyvaksymisPaatosVaiheJulkaisu);
    }
  })(true, Status.EPAAKTIIVINEN_1);

  /**
   * Ensimmäisen jatkopäätöksen päivämäärä ja asiatunnus annettu
   */
  const jatkoPaatos1 = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      const jatkoPaatos = p.kasittelynTila?.ensimmainenJatkopaatos;
      if (jatkoPaatos && jatkoPaatos.asianumero && jatkoPaatos.paatoksenPvm && jatkoPaatos.aktiivinen) {
        p.status = API.Status.JATKOPAATOS_1_AINEISTOT;
        if (
          doesAineistoNahtavillaContainKategorisoidutAineistot(p.jatkoPaatos1Vaihe?.aineistoNahtavilla) &&
          !!p.jatkoPaatos1Vaihe?.hyvaksymisPaatos?.length
        ) {
          p.status = API.Status.JATKOPAATOS_1;
        }
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  /**
   * Jos jatkopäätöksen kuulutuksen päättymispäivästä on 6kk, niin tila on epäaktiivinen
   */
  const epaAktiivinen2 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.Projekti> {
    getPaatosVaihe(p: API.Projekti): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return getHyvaksyttyHyvaksymisPaatosJulkaisu(p.jatkoPaatos1VaiheJulkaisu);
    }
  })(false, Status.EPAAKTIIVINEN_2);

  /**
   * Ensimmäisen jatkopäätöksen päivämäärä ja asiatunnus annettu
   */
  const jatkoPaatos2 = new (class extends StatusHandler<API.Projekti> {
    handle(p: API.Projekti) {
      const jatkoPaatos = p.kasittelynTila?.toinenJatkopaatos;
      if (jatkoPaatos && jatkoPaatos.asianumero && jatkoPaatos.paatoksenPvm) {
        p.status = API.Status.JATKOPAATOS_2_AINEISTOT;
        if (
          doesAineistoNahtavillaContainKategorisoidutAineistot(p.jatkoPaatos2Vaihe?.aineistoNahtavilla) &&
          !!p.jatkoPaatos2Vaihe?.hyvaksymisPaatos?.length
        ) {
          p.status = API.Status.JATKOPAATOS_2;
        }
        super.handle(p); // Continue evaluating next rules
      }
    }
  })();

  /**
   * Jos toisen jatkopäätöksen kuulutuksen päättymispäivästä on 6kk, niin tila on epäaktiivinen
   */
  const epaAktiivinen3 = new (class extends AbstractHyvaksymisPaatosEpaAktiivinenStatusHandler<API.Projekti> {
    getPaatosVaihe(p: API.Projekti): { kuulutusVaihePaattyyPaiva?: string | null } | null | undefined {
      return getHyvaksyttyHyvaksymisPaatosJulkaisu(p.jatkoPaatos2VaiheJulkaisu);
    }
  })(false, Status.EPAAKTIIVINEN_3);

  perustiedot
    .setNext(suunnittelu)
    .setNext(nahtavillaOlo)
    .setNext(hyvaksymisMenettelyssa)
    .setNext(epaAktiivinen1)
    .setNext(jatkoPaatos1)
    .setNext(epaAktiivinen2)
    .setNext(jatkoPaatos2)
    .setNext(epaAktiivinen3);
  perustiedot.handle(projekti);
}
