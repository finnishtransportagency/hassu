import { DBProjekti, UudelleenKuulutus } from "../../database/model";
import {
  KayttajaTyyppi,
  KuulutusJulkaisuTila,
  Projekti,
  Status,
  TallennaProjektiInput,
  UudelleenKuulutusInput,
  VuorovaikutusKierrosTila,
  VuorovaikutusPaivitysInput,
  VuorovaikutusPerustiedotInput,
} from "../../../../common/graphql/apiModel";
import { requirePermissionMuokkaa } from "../../user";
import { requireOmistaja } from "../../user/userService";
import { projektiAdapter } from "../adapter/projektiAdapter";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import difference from "lodash/difference";
import { isProjektiStatusGreaterOrEqualTo } from "../../../../common/statusOrder";
import { kategorisoimattomatId } from "../../../../common/aineistoKategoriat";
import { viimeisinTilaOnMigraatio } from "../../../../common/util/tilaUtils";
import { personSearch } from "../../personSearch/personSearchClient";
import { Person } from "../../personSearch/kayttajas";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import dayjs from "dayjs";
import { validateKasittelynTila } from "./validateKasittelyntila";
import { isAllowedToChangeVahainenMenettelyHelper } from "../../../../common/util/operationValidators";
import { adaptMuokkausTila } from "../projektiUtil";

function validateVarahenkiloModifyPermissions(projekti: DBProjekti, input: TallennaProjektiInput) {
  // Vain omistaja voi muokata projektiPaallikonVarahenkilo-kenttää poistamalla varahenkilöyden
  projekti.kayttoOikeudet
    .filter((user) => user.tyyppi == KayttajaTyyppi.VARAHENKILO && user.muokattavissa === true)
    .forEach((varahenkilo) => {
      // Vain omistaja voi muokata varahenkilöitä
      const varahenkiloInput = input.kayttoOikeudet?.filter((user) => user.kayttajatunnus == varahenkilo.kayttajatunnus).pop();
      if (varahenkiloInput) {
        if (varahenkiloInput.tyyppi !== varahenkilo.tyyppi) {
          requireOmistaja(projekti, "varahenkilön muokkaaminen");
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
            requireOmistaja(projekti, "varahenkilön lisääminen");
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

function validateKielivalinta(dbProjekti: DBProjekti, input: TallennaProjektiInput) {
  if (viimeisinTilaOnMigraatio(dbProjekti)) {
    // tai ei ole kuulutuksia/kutsuja ollenkaan
    return;
  }
  const kielivalintaaOllaanMuuttamassa = !(
    (input.kielitiedot?.ensisijainenKieli === undefined ||
      dbProjekti.kielitiedot?.ensisijainenKieli === input.kielitiedot?.ensisijainenKieli) &&
    (input.kielitiedot?.toissijainenKieli === undefined ||
      dbProjekti.kielitiedot?.toissijainenKieli === input.kielitiedot?.toissijainenKieli)
  );
  if (kielivalintaaOllaanMuuttamassa) {
    throw new IllegalArgumentError(
      "Kielitietoja ei voi muuttaa aloituskuulutuksen julkaisemisen jälkeen tai aloituskuulutuksen ollessa hyväksyttävänä!"
    );
  }
}

/**
 * Validoi, että suunnittelusopimusta ei poisteta tai lisätä sen jälkeen kun aloituskuulutusjulkaisu on hyväksynnässä tai hyväksytty
 */
function validateSuunnitteluSopimus(dbProjekti: DBProjekti, input: TallennaProjektiInput) {
  const isSuunnitteluSopimusAddedOrDeleted =
    (input.suunnitteluSopimus === null && !!dbProjekti.suunnitteluSopimus) ||
    (!!input.suunnitteluSopimus && !dbProjekti.suunnitteluSopimus);

  const aloituskuulutusjulkaisuja = dbProjekti?.aloitusKuulutusJulkaisut?.length;
  if (!aloituskuulutusjulkaisuja || aloituskuulutusjulkaisuja < 1) {
    return;
  } // Lista voi olla myos olemassa, mutta tyhja, jos kuulutus on esim palautettu muokattavaksi

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

export async function validateTallennaProjekti(projekti: DBProjekti, input: TallennaProjektiInput): Promise<void> {
  requirePermissionMuokkaa(projekti);
  const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
  validateKielivalinta(projekti, input);
  validateKasittelynTila(projekti, apiProjekti, input);
  validateVarahenkiloModifyPermissions(projekti, input);
  validateSuunnitteluSopimus(projekti, input);
  validateVahainenMenettely(projekti, input);
  validateVuorovaikutuskierrokset(projekti, input);
  validateUudelleenKuulutus(projekti, input);
  validateNahtavillaoloKuulutustietojenTallennus(apiProjekti, input);
  validatePaatosKuulutustietojenTallennus(apiProjekti, input);
  await validateKayttoOikeusElyOrganisaatio(input);
}

export function validatePaivitaVuorovaikutus(projekti: DBProjekti, input: VuorovaikutusPaivitysInput): void {
  requirePermissionMuokkaa(projekti);
  const affectedJulkaisu = projekti.vuorovaikutusKierrosJulkaisut?.find((julkaisu) => julkaisu.id == input.vuorovaikutusNumero);
  if (!affectedJulkaisu) {
    throw new IllegalArgumentError("Vuorovaikutusta ei ole vielä julkaistu");
  }
  if (input.vuorovaikutusNumero !== projekti.vuorovaikutusKierros?.vuorovaikutusNumero) {
    throw new IllegalArgumentError("Vuorovaikutusta ei voi päivittää, koska seuraava kierros on jo otettu suunnitteluun.");
  }
  if (!input.vuorovaikutusTilaisuudet) {
    throw new IllegalArgumentError("Input ei sisällä kenttää vuorovaikutusTilaisuudet");
  }
  if (input.vuorovaikutusTilaisuudet.length === 0) {
    throw new IllegalArgumentError("Vuorovaikutustilaisuuksia ei saa poistaa.");
  }
  if (input.vuorovaikutusTilaisuudet.length !== affectedJulkaisu.vuorovaikutusTilaisuudet?.length) {
    throw new IllegalArgumentError("Vuorovaikutustilaisuuksien määrää ei saa muuttaa");
  }
  if (
    input.vuorovaikutusTilaisuudet.find(
      (tilaisuus) =>
        difference(Object.keys(tilaisuus), ["lisatiedot", "esitettavatYhteystiedot", "kaytettavaPalvelu", "linkki", "nimi", "peruttu"])
          .length > 0
    )
  ) {
    throw new IllegalArgumentError(
      `Vuorovaikutus sisältää kiellettyjä arvoja. Sallittuja: ["lisatiedot", "esitettavatYhteystiedot", "kaytettavaPalvelu", "linkki", "nimi", "peruttu"]`
    );
  }
  if (projekti.nahtavillaoloVaiheJulkaisut && projekti.nahtavillaoloVaiheJulkaisut.length !== 0) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
}

export function validatePaivitaPerustiedot(projekti: DBProjekti, input: VuorovaikutusPerustiedotInput): void {
  if (projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.MUOKATTAVISSA) {
    throw new IllegalArgumentError(`Vuorovaikutuskierros on muokattavissa. Käytä normaalia projektin päivitystoimintoa.`);
  }
  if (projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.MIGROITU) {
    throw new IllegalArgumentError(`Et voi päivittää migratoidun vuorovaikutuskierroksen perustietoja.`);
  }
  if (projekti.vuorovaikutusKierros?.vuorovaikutusNumero !== input.vuorovaikutusKierros.vuorovaikutusNumero) {
    throw new IllegalArgumentError(`Et voi päivittää muun viimeisimmän vuorovaikutuskierroksen perustietoja.`);
  }
  if (projekti.nahtavillaoloVaiheJulkaisut && projekti.nahtavillaoloVaiheJulkaisut.length !== 0) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
}

/**
 * Validoi, että vahainenMenettely-tietoa ei muokata sen jälkeen kun aloituskuulutusjulkaisu on hyväksynnässä tai hyväksytty
 */
function validateVahainenMenettely(dbProjekti: DBProjekti, input: TallennaProjektiInput) {
  if (
    (input.vahainenMenettely === true || (input.vahainenMenettely === undefined && dbProjekti.vahainenMenettely === true)) &&
    (input.suunnitteluSopimus || (input.suunnitteluSopimus === undefined && dbProjekti.suunnitteluSopimus))
  ) {
    throw new IllegalArgumentError("Projekteilla, joihin sovelletaan vähäistä menettelyä, ei voi olla suunnittelusopimusta.");
  }

  const aloituskuulutusjulkaisuja = dbProjekti?.aloitusKuulutusJulkaisut?.length;
  if (!aloituskuulutusjulkaisuja || aloituskuulutusjulkaisuja < 1) {
    return;
  } // Lista voi olla myos olemassa, mutta tyhja, jos kuulutus on esim palautettu muokattavaksi

  const isVahainenMenettelyValueChanged =
    typeof input.vahainenMenettely === "boolean" && !!input.vahainenMenettely !== !!dbProjekti.vahainenMenettely;

  const allowedToChangeVahainenMenettely = isAllowedToChangeVahainenMenettely(dbProjekti);
  if (isVahainenMenettelyValueChanged && !allowedToChangeVahainenMenettely) {
    throw new IllegalArgumentError(
      "Vähäinen menettely -tietoa ei voi muuttaa, jos aloituskuulutus on jo julkaistu tai se odottaa hyväksyntää!"
    );
  }
}

function isAllowedToChangeVahainenMenettely(dbProjekti: DBProjekti) {
  return isAllowedToChangeVahainenMenettelyHelper({
    aloitusKuulutusMuokkausTila: dbProjekti.aloitusKuulutus
      ? adaptMuokkausTila(dbProjekti.aloitusKuulutus, dbProjekti.aloitusKuulutusJulkaisut)
      : undefined,
    vuorovaikutusKierrosTila: dbProjekti.vuorovaikutusKierros?.tila,
    nahtavillaoloVaiheMuokkausTila: dbProjekti.nahtavillaoloVaihe
      ? adaptMuokkausTila(dbProjekti.nahtavillaoloVaihe, dbProjekti.nahtavillaoloVaiheJulkaisut)
      : undefined,
    hyvaksymisVaiheMuokkausTila: dbProjekti.hyvaksymisPaatosVaihe
      ? adaptMuokkausTila(dbProjekti.hyvaksymisPaatosVaihe, dbProjekti.hyvaksymisPaatosVaiheJulkaisut)
      : undefined,
    jatkoPaatos1VaiheMuokkausTila: dbProjekti.jatkoPaatos1Vaihe
      ? adaptMuokkausTila(dbProjekti.jatkoPaatos1Vaihe, dbProjekti.jatkoPaatos1VaiheJulkaisut)
      : undefined,
    jatkoPaatos2VaiheMuokkausTila: dbProjekti.jatkoPaatos2Vaihe
      ? adaptMuokkausTila(dbProjekti.jatkoPaatos2Vaihe, dbProjekti.jatkoPaatos2VaiheJulkaisut)
      : undefined,
  });
}

function validateVuorovaikutuskierrokset(projekti: DBProjekti, input: TallennaProjektiInput) {
  const nbr = input.vuorovaikutusKierros?.vuorovaikutusNumero;
  const julkaisujenIdt = projekti.vuorovaikutusKierrosJulkaisut?.map((julkaisu) => julkaisu.id).filter((id) => id !== undefined) || [0];
  const suurinJulkaisuId = Math.max(...julkaisujenIdt);
  if (!projekti.vuorovaikutusKierros && nbr !== undefined && nbr !== suurinJulkaisuId + 1) {
    throw new IllegalArgumentError(
      "Vuorovaikutuskierroksen numeron on oltava pienimmillään yksi (1) ja yhden suurempi kuin aiemmat julkaisut."
    );
  }
  if (projekti.vuorovaikutusKierros && nbr !== undefined && projekti.vuorovaikutusKierros.vuorovaikutusNumero !== nbr) {
    throw new IllegalArgumentError("Annettu vuorovaikutusnumero ei vastaa meneillään olevan kierroksen numeroa.");
  }
  const julkaisupaiva = input.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva;
  const edellisenJulkaisupaiva = projekti.vuorovaikutusKierrosJulkaisut?.find(
    (julkaisu) => julkaisu.id === (nbr || 1) - 1
  )?.vuorovaikutusJulkaisuPaiva;
  if (julkaisupaiva && edellisenJulkaisupaiva && dayjs(julkaisupaiva).isBefore(edellisenJulkaisupaiva, "day")) {
    throw new IllegalArgumentError("Uutta vuorovaikutuskierrosta ei voi julkaista ennen edellistä!");
  }
}

function validateNahtavillaoloKuulutustietojenTallennus(projekti: Projekti, input: TallennaProjektiInput) {
  const { aineistoNahtavilla: aineistoNahtavilla, lisaAineisto: _la, ...kuulutuksenTiedot } = input.nahtavillaoloVaihe || {};
  const kuulutuksenTiedotContainInput = Object.values(kuulutuksenTiedot).some((value) => !!value);

  const aineistotPresent = aineistoNahtavilla?.length;
  const hasAineistotLackingKategoria = aineistoNahtavilla?.some(
    (aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId
  );
  const aineistotOk = !!aineistotPresent && !hasAineistotLackingKategoria;
  if (kuulutuksenTiedotContainInput && !isProjektiStatusGreaterOrEqualTo(projekti, Status.NAHTAVILLAOLO) && !aineistotOk) {
    throw new IllegalArgumentError("Nähtävilläolovaiheen aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia.");
  }
}

type PaatosKey = keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">;

function validatePaatosKuulutustietojenTallennus(projekti: Projekti, input: TallennaProjektiInput) {
  const paatosKeyStatusArray: [PaatosKey, Status][] = [
    ["hyvaksymisPaatosVaihe", Status.HYVAKSYMISMENETTELYSSA],
    ["jatkoPaatos1Vaihe", Status.JATKOPAATOS_1],
    ["jatkoPaatos2Vaihe", Status.JATKOPAATOS_2],
  ];

  paatosKeyStatusArray.forEach(([key, status]) => {
    const { aineistoNahtavilla, hyvaksymisPaatos, ...kuulutuksenTiedot } = input[key] || {};
    const kuulutuksenTiedotContainInput = Object.values(kuulutuksenTiedot).some((value) => !!value);
    const aineistotPresent = !!aineistoNahtavilla?.length;
    const paatosAineistoPresent = !!hyvaksymisPaatos?.length;
    const hasAineistotLackingKategoria = !!aineistoNahtavilla?.some(
      (aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId
    );
    const aineistoInputOk = aineistotPresent && paatosAineistoPresent && !hasAineistotLackingKategoria;
    if (kuulutuksenTiedotContainInput && !isProjektiStatusGreaterOrEqualTo(projekti, status) && !aineistoInputOk) {
      throw new IllegalArgumentError(key + " aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia.");
    }
  });
}

async function validateKayttoOikeusElyOrganisaatio(input: TallennaProjektiInput) {
  if (input.kayttoOikeudet) {
    const kayttajaMap = (await personSearch.getKayttajas()).asMap();
    input.kayttoOikeudet.forEach((kayttoOikeus) => {
      const kayttajaTiedot = kayttajaMap[kayttoOikeus.kayttajatunnus] as Person | undefined;
      // Jos käyttäjää ei löydy, ei voida varmistaa hänen kuulumistaan ELYyn
      // Poistetaan elyOrganisaatio-tieto
      if (!kayttajaTiedot) {
        kayttoOikeus.elyOrganisaatio = undefined;
        throw new IllegalArgumentError(`Tallennettavaa käyttäjää '${kayttoOikeus.kayttajatunnus}' ei löydy käyttäjälistauksesta.`);
      }
      const nonElyUserWithElyOrganisaatio = !organisaatioIsEly(kayttajaTiedot.organisaatio) && !!kayttoOikeus.elyOrganisaatio;
      if (nonElyUserWithElyOrganisaatio) {
        throw new IllegalArgumentError(
          `Ely-organisaatiotarkennus asetettu virheellisesti käyttäjälle '${kayttoOikeus.kayttajatunnus}'. ` +
            `Kyseinen käyttäjä kuuluu organisaatioon '${kayttajaTiedot.organisaatio}'. ` +
            `Ely-organisaatiotarkennuksen voi asettaa vain käyttäjälle, jonka organisaatiotietona on 'ELY'.`
        );
      }
    });
  }
}
