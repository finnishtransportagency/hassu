import { DBVaylaUser, UudelleenKuulutus, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { parseDate } from "../util/dateUtil";
import { assertIsDefined } from "../util/assertions";
import * as API from "../../../common/graphql/apiModel";

export interface GenericKuulutus {
  tila?: API.KuulutusJulkaisuTila | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
}
export type GenericDbKuulutusJulkaisu = Pick<
  NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus" | "hyvaksymisPaiva"
>;

export type GenericApiKuulutusJulkaisu = Pick<
  API.NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus"
>;

export function findJulkaisutWithTila<J extends GenericKuulutus>(
  julkaisut: J[] | undefined | null,
  tila: API.KuulutusJulkaisuTila
): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila)?.sort(sortMostRecentkuulutusLast);
}

export function findJulkaisuWithTila<J extends GenericKuulutus>(
  julkaisut: J[] | undefined | null,
  tila: API.KuulutusJulkaisuTila
): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}

function sortMostRecentkuulutusLast<T extends GenericKuulutus>(julkaisu1: T, julkaisu2: T) {
  assertIsDefined(julkaisu1.kuulutusPaiva);
  assertIsDefined(julkaisu2.kuulutusPaiva);
  return parseDate(julkaisu1.kuulutusPaiva).unix() - parseDate(julkaisu2.kuulutusPaiva).unix();
}

interface ObjectWithNumberId {
  id: number;
}

export function findJulkaisuWithId<J extends ObjectWithNumberId>(julkaisut: J[] | undefined | null, id: number): J | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.id == id).pop();
}

export function findUserByKayttajatunnus(kayttoOikeudet: DBVaylaUser[], kayttajatunnus: string | undefined): DBVaylaUser | undefined {
  if (!kayttajatunnus) {
    return undefined;
  }
  return kayttoOikeudet.find((value) => value.kayttajatunnus == kayttajatunnus);
}

export function adaptMuokkausTila<J extends GenericKuulutus>(
  kuulutus: GenericKuulutus,
  julkaisut: J[] | null | undefined
): API.MuokkausTila {
  // Migroitu on aina migroitu, ei luku- eikä muokkaustila
  if (findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.MIGROITU)) {
    return API.MuokkausTila.MIGROITU;
  }
  // Hyväksyntää odottaessa aina lukutilassa
  if (findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA)) {
    return API.MuokkausTila.LUKU;
  }
  // Uudelleenkuuluttaessa muokataan, jos ei olla odottamassa hyväksyntää
  if (kuulutus.uudelleenKuulutus) {
    return API.MuokkausTila.MUOKKAUS;
  }
  // Jos löytyy hyväksytty kuulutus, ollaan lukutilassa. Muuten muokkaustilassa.
  if (findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY)) {
    return API.MuokkausTila.LUKU;
  }
  return API.MuokkausTila.MUOKKAUS;
}
