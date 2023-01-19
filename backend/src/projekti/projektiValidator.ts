import { DBProjekti, UudelleenKuulutus } from "../database/model";
import {
  KayttajaTyyppi,
  KuulutusJulkaisuTila,
  Projekti,
  TallennaProjektiInput,
  UudelleenKuulutusInput,
  VuorovaikutusPaivitysInput,
  VuorovaikutusPerustiedotInput,
} from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaa } from "../user";
import { requireAdmin, requireOmistaja } from "../user/userService";
import { projektiAdapter } from "./adapter/projektiAdapter";
import assert from "assert";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
import { statusOrder } from "../../../common/statusOrder";
import difference from "lodash/difference";

function validateKasittelynTila(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  if (input.kasittelynTila) {
    requireAdmin("Hyvaksymispaatoksia voi tallentaa vain Hassun yllapitaja");

    assert(apiProjekti.status, "Projektilla ei ole statusta");
    const currentStatus = statusOrder[apiProjekti.status];

    if (input.kasittelynTila.hyvaksymispaatos) {
      if (currentStatus < statusOrder.NAHTAVILLAOLO) {
        throw new IllegalArgumentError(
          "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin. Projektin status nyt:" + apiProjekti.status
        );
      }
    }

    if (input.kasittelynTila.ensimmainenJatkopaatos) {
      if (
        !projekti.kasittelynTila?.hyvaksymispaatos ||
        (currentStatus !== statusOrder.EPAAKTIIVINEN_1 && currentStatus !== statusOrder.JATKOPAATOS_1)
      ) {
        throw new IllegalArgumentError(
          "Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen. Projektilla pitää olla myös hyväksymispäätös. Projektin status nyt:" +
            apiProjekti.status
        );
      }
    }

    if (input.kasittelynTila.toinenJatkopaatos) {
      if (
        !projekti.kasittelynTila?.hyvaksymispaatos ||
        !projekti.kasittelynTila?.ensimmainenJatkopaatos ||
        (currentStatus !== statusOrder.EPAAKTIIVINEN_2 && currentStatus !== statusOrder.JATKOPAATOS_2)
      ) {
        throw new IllegalArgumentError(
          "Toista jatkopäätöstä voi muokata vain ensimmäisen jatkopäätöksen jälkeen. Projektilla pitää olla myös hyväksymispäätös ja ensimmäinen jatkopäätös. Projektin status nyt:" +
            apiProjekti.status
        );
      }
    }
  }
}

function validateVarahenkiloModifyPermissions(projekti: DBProjekti, input: TallennaProjektiInput) {
  // Vain omistaja voi muokata projektiPaallikonVarahenkilo-kenttää poistamalla varahenkilöyden
  projekti.kayttoOikeudet
    .filter((user) => user.tyyppi == KayttajaTyyppi.VARAHENKILO && user.muokattavissa === true)
    .forEach((varahenkilo) => {
      // Vain omistaja voi muokata varahenkilöitä
      const varahenkiloInput = input.kayttoOikeudet?.filter((user) => user.kayttajatunnus == varahenkilo.kayttajatunnus).pop();
      if (varahenkiloInput) {
        if (varahenkiloInput.tyyppi !== varahenkilo.tyyppi) {
          requireOmistaja(projekti);
        }
      }
    });

  input.kayttoOikeudet
    ?.filter((inputUser) => inputUser.tyyppi == KayttajaTyyppi.VARAHENKILO)
    .forEach((inputUser) => {
      // Vain omistaja voi muokata varahenkilöitä lisäämällä varahenkilöyden
      projekti.kayttoOikeudet
        ?.filter((kayttaja) => kayttaja.kayttajatunnus == inputUser.kayttajatunnus)
        .forEach((projektiKayttaja) => {
          if (projektiKayttaja.tyyppi !== inputUser.tyyppi) {
            requireOmistaja(projekti);
          }
        });
    });
}

type UudelleenKuulutusTuple = [UudelleenKuulutus | null | undefined, UudelleenKuulutusInput | null | undefined];

/**
 * Validoi, että jos yritetään tallentaa uudelleenkuulutusta, sellainen on olemassa
 */
function validateUudelleenKuulutus(projekti: DBProjekti, input: TallennaProjektiInput) {
  const uudelleenKuulutusTuples: UudelleenKuulutusTuple[] = [
    [projekti.aloitusKuulutus?.uudelleenKuulutus, input.aloitusKuulutus?.uudelleenKuulutus],
    [projekti.nahtavillaoloVaihe?.uudelleenKuulutus, input.nahtavillaoloVaihe?.uudelleenKuulutus],
    [projekti.hyvaksymisPaatosVaihe?.uudelleenKuulutus, input.hyvaksymisPaatosVaihe?.uudelleenKuulutus],
    [projekti.jatkoPaatos1Vaihe?.uudelleenKuulutus, input.jatkoPaatos1Vaihe?.uudelleenKuulutus],
    [projekti.jatkoPaatos2Vaihe?.uudelleenKuulutus, input.jatkoPaatos2Vaihe?.uudelleenKuulutus],
  ];
  uudelleenKuulutusTuples.forEach(([uudelleenKuulutus, uudelleenKuulutusInput]) => {
    if (uudelleenKuulutusInput && !uudelleenKuulutus) {
      throw new IllegalArgumentError("Uudelleenkuulutuksen tietoja ei voi tallentaa jos uudelleenkuulutusta ei ole vielä avattu");
    }
  });
}

/**
 * Validoi, että suunnittelusopimusta ei poisteta tai lisätä sen jälkeen kun aloituskuulutusjulkaisu on hyväksynnässä tai hyväksytty
 */
function validateSuunnitteluSopimus(dbProjekti: DBProjekti, input: TallennaProjektiInput) {
  const isSuunnitteluSopimusAddedOrDeleted =
    (input.suunnitteluSopimus === null && !!dbProjekti.suunnitteluSopimus) ||
    (!!input.suunnitteluSopimus && !dbProjekti.suunnitteluSopimus);

  const aloituskuulutusjulkaisuja = dbProjekti?.aloitusKuulutusJulkaisut?.length;
  if (!aloituskuulutusjulkaisuja || aloituskuulutusjulkaisuja < 1) return; // Lista voi olla myos olemassa, mutta tyhja, jos kuulutus on esim palautettu muokattavaksi

  const latestAloituskuulutusJulkaisuTila = dbProjekti?.aloitusKuulutusJulkaisut?.[dbProjekti.aloitusKuulutusJulkaisut.length - 1].tila;
  const isLatestJulkaisuPendingApprovalOrApproved =
    !!latestAloituskuulutusJulkaisuTila &&
    [KuulutusJulkaisuTila.HYVAKSYTTY, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA].includes(latestAloituskuulutusJulkaisuTila);

  if (isSuunnitteluSopimusAddedOrDeleted && isLatestJulkaisuPendingApprovalOrApproved) {
    throw new IllegalArgumentError(
      "Suunnittelusopimuksen olemassaoloa ei voi muuttaa, jos aloituskuulutus on jo julkaistu tai se odottaa hyväksyntää!"
    );
  }
}

export function validateTallennaProjekti(projekti: DBProjekti, input: TallennaProjektiInput): void {
  requirePermissionMuokkaa(projekti);
  const apiProjekti = projektiAdapter.adaptProjekti(projekti);
  validateKasittelynTila(projekti, apiProjekti, input);
  validateVarahenkiloModifyPermissions(projekti, input);
  validateSuunnitteluSopimus(projekti, input);
  validateVahainenMenettely(projekti, input);
  validateUudelleenKuulutus(projekti, input);
}

export function validatePaivitaVuorovaikutus(projekti: DBProjekti, input: VuorovaikutusPaivitysInput): void {
  requirePermissionMuokkaa(projekti);
  if (input.vuorovaikutusNumero && !projekti.vuorovaikutusKierrosJulkaisut?.[input.vuorovaikutusNumero]) {
    throw new IllegalArgumentError("Vuorovaikutusta ei ole vielä julkaistu");
  }
  if ((input.vuorovaikutusNumero && projekti.vuorovaikutusKierros?.vuorovaikutusNumero) || 0 > input.vuorovaikutusNumero) {
    throw new IllegalArgumentError("Vuorovaikutusta ei voi päivittää, koska seuraava kierros on jo otettu suunnitteluun.");
  }
  if (input.vuorovaikutusNumero && (projekti.vuorovaikutusKierrosJulkaisut || []).length > input.vuorovaikutusNumero) {
    throw new IllegalArgumentError("Vuorovaikutusta ei voi päivittää, koska seuraava kierros on jo julkaistu.");
  }
  if (!input.vuorovaikutusTilaisuudet) {
    throw new IllegalArgumentError("Input ei sisällä kenttää vuorovaikutusTilaisuudet");
  }
  if (input.vuorovaikutusTilaisuudet.length === 0) {
    throw new IllegalArgumentError("Vuorovaikutustilaisuuksia ei saa poistaa.");
  }
  if (
    input.vuorovaikutusTilaisuudet.length !==
    projekti.vuorovaikutusKierrosJulkaisut?.[input.vuorovaikutusNumero].vuorovaikutusTilaisuudet?.length
  ) {
    throw new IllegalArgumentError("Vuorovaikutustilaisuuksien määrää ei saa muuttaa");
  }
  if (
    input.vuorovaikutusTilaisuudet.find(
      (tilaisuus) =>
        difference(Object.keys(tilaisuus), ["Saapumisohjeet", "esitettavatYhteystiedot", "kaytettavaPalvelu", "linkki", "nimi", "peruttu"])
          .length > 0
    )
  ) {
    throw new IllegalArgumentError(
      `Vuorovaikutus sisältää kiellettyjä arvoja. Sallittuja: ["Saapumisohjeet", "esitettavatYhteystiedot", "kaytettavaPalvelu", "linkki", "nimi", "peruttu"]`
    );
  }
  if (projekti.nahtavillaoloVaiheJulkaisut && projekti.nahtavillaoloVaiheJulkaisut.length !== 0) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
}

export function validatePaivitaPerustiedot(projekti: DBProjekti, input: VuorovaikutusPerustiedotInput): void {
  if (projekti.vuorovaikutusKierros?.vuorovaikutusNumero !== input.vuorovaikutusKierros.vuorovaikutusNumero) {
    throw new IllegalArgumentError(`Ei ole mahdollista päivittää jäädytettyä vuorovaikutusta`);
  }
  if (projekti.nahtavillaoloVaiheJulkaisut && projekti.nahtavillaoloVaiheJulkaisut.length !== 0) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
}

/**
 * Validoi, että vahainenMenettely-tietoa ei muokata sen jälkeen kun aloituskuulutusjulkaisu on hyväksynnässä tai hyväksytty
 */
function validateVahainenMenettely(dbProjekti: DBProjekti, input: TallennaProjektiInput) {
  const isVahainenMenettelyValueChanged =
    typeof input.vahainenMenettely === "boolean" && !!input.vahainenMenettely !== !!dbProjekti.vahainenMenettely;

  const latestAloituskuulutusJulkaisuTila = dbProjekti?.aloitusKuulutusJulkaisut?.[dbProjekti.aloitusKuulutusJulkaisut.length - 1].tila;
  const isLatestJulkaisuPendingApprovalOrApproved =
    !!latestAloituskuulutusJulkaisuTila &&
    [KuulutusJulkaisuTila.HYVAKSYTTY, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA].includes(latestAloituskuulutusJulkaisuTila);

  if (isVahainenMenettelyValueChanged && isLatestJulkaisuPendingApprovalOrApproved) {
    throw new IllegalArgumentError(
      "Vähäinen menettely -tietoa ei voi muuttaa, jos aloituskuulutus on jo julkaistu tai se odottaa hyväksyntää!"
    );
  }
}
