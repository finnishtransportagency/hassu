import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  UudelleenKuulutus,
} from "../../database/model";
import {
  AloitusKuulutusInput,
  HyvaksymisPaatosVaiheInput,
  KayttajaTyyppi,
  MuokkausTila,
  NahtavillaoloVaiheInput,
  Projekti,
  ProjektiTyyppi,
  Status,
  TallennaProjektiInput,
  UudelleenKuulutusInput,
  VuorovaikutusKierrosTila,
  VuorovaikutusPaivitysInput,
  VuorovaikutusPerustiedotInput,
} from "hassu-common/graphql/apiModel";
import { requirePermissionMuokkaa } from "../../user";
import { requireOmistaja } from "../../user/userService";
import { projektiAdapter } from "../adapter/projektiAdapter";
import { IllegalArgumentError } from "hassu-common/error";
import difference from "lodash/difference";
import { isProjektiStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { viimeisinTilaOnMigraatio } from "hassu-common/util/tilaUtils";
import { personSearch } from "../../personSearch/personSearchClient";
import { Person } from "../../personSearch/kayttajas";
import { organisaatioIsEly } from "../../util/organisaatioIsEly";
import dayjs from "dayjs";
import { validateKasittelynTila } from "./validateKasittelyntila";
import {
  isAllowedToChangeEuRahoitus,
  isAllowedToChangeKielivalinta,
  isAllowedToChangeSuunnittelusopimus,
  isAllowedToChangeVahainenMenettely,
} from "hassu-common/util/operationValidators";
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

function validateKielivalinta(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
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

  const allowedToChangeKielivalinta = isAllowedToChangeKielivalinta(projekti);

  if (kielivalintaaOllaanMuuttamassa && !allowedToChangeKielivalinta) {
    throw new IllegalArgumentError(
      "Kielitietoja ei voi muuttaa aloituskuulutuksen julkaisemisen jälkeen tai aloituskuulutuksen ollessa hyväksyttävänä!"
    );
  }
}

function validateSuunnitteluSopimus(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  const suunnitteluSopimusAfterSaving: boolean =
    !!input.suunnitteluSopimus || !!(input.suunnitteluSopimus === undefined && dbProjekti.suunnitteluSopimus);
  const vahainenMenettelyAfterSaving: boolean =
    !!input.vahainenMenettely || !!(input.vahainenMenettely === undefined && !!dbProjekti.vahainenMenettely);

  if (
    suunnitteluSopimusAfterSaving &&
    (dbProjekti.velho?.tyyppi === ProjektiTyyppi.RATA || dbProjekti.velho?.tyyppi === ProjektiTyyppi.YLEINEN)
  ) {
    throw new IllegalArgumentError("Yleissuunnitelmalla ja ratasuunnitelmalla ei voi olla suunnittelusopimusta");
  }

  if (vahainenMenettelyAfterSaving && suunnitteluSopimusAfterSaving) {
    throw new IllegalArgumentError("Vähäisen menettelyn projektilla ei voi olla suunnittelusopimusta");
  }
  const isSuunnitteluSopimusAddedOrDeleted =
    (input.suunnitteluSopimus === null && !!dbProjekti.suunnitteluSopimus) ||
    (!!input.suunnitteluSopimus && !dbProjekti.suunnitteluSopimus);

  const allowedToChangeSuunnittelusopimus = isAllowedToChangeSuunnittelusopimus(projekti);

  if (isSuunnitteluSopimusAddedOrDeleted && !allowedToChangeSuunnittelusopimus) {
    throw new IllegalArgumentError(
      "Suunnittelusopimuksen olemassaoloa ei voi muuttaa, jos ensimmäinen HASSUssa tehty vaihe ei ole muokkaustilassa."
    );
  }
}

function validateEuRahoitus(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  const isEuSopimusAddedOrDeleted =
    ((input.euRahoitus === null || input.euRahoitus === false) && !!dbProjekti.euRahoitus) ||
    (!!input.euRahoitus && !dbProjekti.euRahoitus);

  const allowedToChangeEuSopimus = isAllowedToChangeEuRahoitus(projekti);

  if (isEuSopimusAddedOrDeleted && !allowedToChangeEuSopimus) {
    throw new IllegalArgumentError(
      "EU-rahoituksen olemassaoloa ei voi muuttaa, jos ensimmäinen HASSUssa tehty vaihe ei ole muokkaustilassa."
    );
  }
}

export async function validateTallennaProjekti(projekti: DBProjekti, input: TallennaProjektiInput): Promise<void> {
  requirePermissionMuokkaa(projekti);
  const apiProjekti = await projektiAdapter.adaptProjekti(projekti, undefined, false);
  validateKielivalinta(projekti, apiProjekti, input);
  validateEuRahoitus(projekti, apiProjekti, input);
  validateKasittelynTila(projekti, apiProjekti, input);
  validateVarahenkiloModifyPermissions(projekti, input);
  validateSuunnitteluSopimus(projekti, apiProjekti, input);
  validateVahainenMenettely(projekti, apiProjekti, input);
  validateVuorovaikutuskierrokset(projekti, input);
  validateUudelleenKuulutus(projekti, input);
  validateAloituskuulutus(projekti, input.aloitusKuulutus);
  validateNahtavillaoloVaihe(projekti, apiProjekti, input);
  validateLausuntoPyynnot(projekti, input);
  validateLausuntoPyyntojenTaydennykset(projekti, input);
  validateHyvaksymisPaatosJatkoPaatos(projekti, apiProjekti, input);
  validateAsianhallinnanAktivointikytkin(apiProjekti, input);
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

function validateVahainenMenettely(dbProjekti: DBProjekti, projekti: Projekti, input: TallennaProjektiInput) {
  const vahainenMenettelyAfterSaving: boolean =
    input.vahainenMenettely === true || (input.vahainenMenettely === undefined && dbProjekti.vahainenMenettely === true);
  const suunnitteluSopimusAfterSaving: boolean =
    !!input.suunnitteluSopimus || !!(input.suunnitteluSopimus === undefined && dbProjekti.suunnitteluSopimus);

  if (vahainenMenettelyAfterSaving && suunnitteluSopimusAfterSaving) {
    throw new IllegalArgumentError("Projekteilla, joihin sovelletaan vähäistä menettelyä, ei voi olla suunnittelusopimusta.");
  }

  const isVahainenMenettelyValueChanged =
    typeof input.vahainenMenettely === "boolean" && !!input.vahainenMenettely !== !!dbProjekti.vahainenMenettely;

  const allowedToChangeVahainenMenettely = isAllowedToChangeVahainenMenettely(projekti);
  if (isVahainenMenettelyValueChanged && !allowedToChangeVahainenMenettely) {
    throw new IllegalArgumentError(
      "Vähäisen menettelyn olemassaoloa ei voi muuttaa, jos ensimmäinen HASSUssa tehty vaihe ei ole muokkaustilassa."
    );
  }
}

function validateVuorovaikutuskierrokset(projekti: DBProjekti, input: TallennaProjektiInput) {
  const nbr = input.vuorovaikutusKierros?.vuorovaikutusNumero;
  const julkaisujenIdt = projekti.vuorovaikutusKierrosJulkaisut?.map((julkaisu) => julkaisu.id).filter((id) => id !== undefined) ?? [0];
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
    (julkaisu) => julkaisu.id === (nbr ?? 1) - 1
  )?.vuorovaikutusJulkaisuPaiva;
  if (julkaisupaiva && edellisenJulkaisupaiva && dayjs(julkaisupaiva).isBefore(edellisenJulkaisupaiva, "day")) {
    throw new IllegalArgumentError("Uutta vuorovaikutuskierrosta ei voi julkaista ennen edellistä!");
  }
}

function validateNahtavillaoloVaihe(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  validateMuokkaustilaAllowsInput(projekti.nahtavillaoloVaihe, projekti.nahtavillaoloVaiheJulkaisut, input.nahtavillaoloVaihe);

  const { aineistoNahtavilla, ...kuulutuksenTiedot } = input.nahtavillaoloVaihe ?? {};
  const kuulutuksenTiedotContainInput = Object.values(kuulutuksenTiedot).some((value) => !!value);

  const aineistotPresent = aineistoNahtavilla?.length;
  const hasAineistotLackingKategoria = aineistoNahtavilla?.some(
    (aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId
  );
  const aineistotOk = !!aineistotPresent && !hasAineistotLackingKategoria;
  if (kuulutuksenTiedotContainInput && !isProjektiStatusGreaterOrEqualTo(apiProjekti, Status.NAHTAVILLAOLO) && !aineistotOk) {
    throw new IllegalArgumentError("Nähtävilläolovaiheen aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia.");
  }
}

function validateLausuntoPyynnot(projekti: DBProjekti, input: TallennaProjektiInput) {
  const legacyLausuntoPyyntoUuids = projekti.lausuntoPyynnot?.filter((lp) => lp.legacy).map((lp) => lp.uuid);
  const lausuntoPyynnot = input.lausuntoPyynnot;
  if (lausuntoPyynnot === undefined) {
    return;
  }

  if (lausuntoPyynnot?.some((lp) => legacyLausuntoPyyntoUuids?.includes(lp.uuid))) {
    throw new IllegalArgumentError("Et voi muokata vanhassa järjestelmässä luotuja lisäaineistoja");
  }
  const currentLausuntoPyyntoUuids = projekti.lausuntoPyynnot?.filter((lp) => !lp.legacy).map((lp) => lp.uuid);
  if (currentLausuntoPyyntoUuids?.some((lpuuid) => !lausuntoPyynnot?.find((lp) => lp.uuid == lpuuid))) {
    throw new IllegalArgumentError("Poistetut lausuntopyyntöjen aineistolinkit on merkittävä poistettaviksi inputissa.");
  }
}

function validateLausuntoPyyntojenTaydennykset(projekti: DBProjekti, input: TallennaProjektiInput) {
  const currentLausuntoPyyntoUuids = projekti.lausuntoPyynnonTaydennykset?.map((lp) => lp.uuid);
  const lausuntoPyynnonTaydennykset = input.lausuntoPyynnonTaydennykset;
  if (lausuntoPyynnonTaydennykset === undefined) {
    return;
  }

  if (currentLausuntoPyyntoUuids?.some((lpuuid) => !lausuntoPyynnonTaydennykset?.find((lp) => lp.uuid == lpuuid))) {
    throw new IllegalArgumentError("Poistetut lausuntopyynnon täydennyksen aineistolinkit on merkittävä poistettaviksi inputissa.");
  }
}

type PaatosKey = keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">;

function validateHyvaksymisPaatosJatkoPaatos(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  validateMuokkaustilaAllowsInput(projekti.hyvaksymisPaatosVaihe, projekti.hyvaksymisPaatosVaiheJulkaisut, input.hyvaksymisPaatosVaihe);
  validateMuokkaustilaAllowsInput(projekti.jatkoPaatos1Vaihe, projekti.jatkoPaatos1VaiheJulkaisut, input.jatkoPaatos1Vaihe);
  validateMuokkaustilaAllowsInput(projekti.jatkoPaatos2Vaihe, projekti.jatkoPaatos2VaiheJulkaisut, input.jatkoPaatos2Vaihe);
  const paatosKeyStatusArray: [PaatosKey, Status][] = [
    ["hyvaksymisPaatosVaihe", Status.HYVAKSYMISMENETTELYSSA],
    ["jatkoPaatos1Vaihe", Status.JATKOPAATOS_1],
    ["jatkoPaatos2Vaihe", Status.JATKOPAATOS_2],
  ];

  paatosKeyStatusArray.forEach(([key, status]) => {
    const { aineistoNahtavilla, hyvaksymisPaatos, ...kuulutuksenTiedot } = input[key] ?? {};
    const kuulutuksenTiedotContainInput = Object.values(kuulutuksenTiedot).some((value) => !!value);
    const aineistotPresent = !!aineistoNahtavilla?.length;
    const paatosAineistoPresent = !!hyvaksymisPaatos?.length;
    const hasAineistotLackingKategoria = !!aineistoNahtavilla?.some(
      (aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId
    );
    const aineistoInputOk = aineistotPresent && paatosAineistoPresent && !hasAineistotLackingKategoria;
    if (kuulutuksenTiedotContainInput && !isProjektiStatusGreaterOrEqualTo(apiProjekti, status) && !aineistoInputOk) {
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

function validateAloituskuulutus(_projekti: DBProjekti, _aloituskuulutus: AloitusKuulutusInput | null | undefined) {
  //TODO
  return;
}

function validateMuokkaustilaAllowsInput(
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined,
  julkaisut: NahtavillaoloVaiheJulkaisu[] | HyvaksymisPaatosVaiheJulkaisu[] | null | undefined,
  input: NahtavillaoloVaiheInput | HyvaksymisPaatosVaiheInput | null | undefined
) {
  if (!vaihe || input === undefined) {
    return;
  }
  if (input === null) {
    throw new IllegalArgumentError("Et voi tyhjentää vaihetta kokonaan tällä toiminnolla.");
  }
  const muokkausTila = adaptMuokkausTila(vaihe, julkaisut);
  if (muokkausTila === MuokkausTila.LUKU) {
    throw new IllegalArgumentError("Vaihe, jota yrität muokata, on lukutilassa.");
  } else if (muokkausTila === MuokkausTila.MIGROITU) {
    throw new IllegalArgumentError("Adminin on avattava uudelleenkuulutus voidaksesi muokata migroitua vaihetta.");
  } else if (muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS) {
    Object.keys(input).forEach((key) => {
      const allowedInputKeys: (keyof NahtavillaoloVaiheInput | keyof HyvaksymisPaatosVaiheInput)[] = ["aineistoNahtavilla"];
      if (!allowedInputKeys.includes(key as keyof NahtavillaoloVaiheInput | keyof HyvaksymisPaatosVaiheInput)) {
        throw new IllegalArgumentError(`Et voi muokata arvoa ${key}, koka projekti on aineistomuokkaustilassa`);
      }
    });
  }
}

function validateAsianhallinnanAktivointikytkin(projekti: Projekti, input: TallennaProjektiInput) {
  if (!projekti.asianhallinta.aktivoitavissa && (Object.keys(input) as (keyof TallennaProjektiInput)[]).includes("asianhallinta")) {
    throw new IllegalArgumentError(
      "Ei voi muokata salliAsianHallintaIntegraatio-tietoa, koska suunnittelusta vastaava viranomainen ei ole Väylävirasto"
    );
  }
}
