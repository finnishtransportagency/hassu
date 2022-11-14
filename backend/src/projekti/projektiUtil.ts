import { DBVaylaUser, UudelleenKuulutus } from "../database/model";
import { parseDate } from "../util/dateUtil";
import { assertIsDefined } from "../util/assertions";
import { MuokkausTila } from "../../../common/graphql/apiModel";

export type GenericKuulutus<T> = {
  tila?: T;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
};

export function findJulkaisutWithTila<J, T>(julkaisut: (J & GenericKuulutus<T>)[] | undefined | null, tila: T): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila)?.sort(sortMostRecentkuulutusLast);
}

export function findJulkaisuWithTila<J, T>(julkaisut: (J & GenericKuulutus<T>)[] | undefined | null, tila: T): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}

function sortMostRecentkuulutusLast<T>(julkaisu1: GenericKuulutus<T>, julkaisu2: GenericKuulutus<T>) {
  assertIsDefined(julkaisu1.kuulutusPaiva);
  assertIsDefined(julkaisu2.kuulutusPaiva);
  return parseDate(julkaisu1.kuulutusPaiva).unix() - parseDate(julkaisu2.kuulutusPaiva).unix();
}

export function findJulkaisuWithId<J>(julkaisut: (J & { id?: number })[] | undefined | null, id: number): J | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.id == id).pop();
}

export function findUserByKayttajatunnus(kayttoOikeudet: DBVaylaUser[], kayttajatunnus: string | undefined): DBVaylaUser | undefined {
  if (!kayttajatunnus) {
    return undefined;
  }
  return kayttoOikeudet.find((value) => value.kayttajatunnus == kayttajatunnus);
}

export function adaptMuokkausTila<J, T>(
  kuulutus: GenericKuulutus<T>,
  julkaisut: J[] | null | undefined,
  migroituTila: T,
  odottaaHyvaksyntaaTila: T,
  hyvaksyttyTila: T
): MuokkausTila {
  // Migroitu on aina migroitu, ei luku- eikä muokkaustila
  if (findJulkaisuWithTila(julkaisut, migroituTila)) {
    return MuokkausTila.MIGROITU;
  }
  // Hyväksyntää odottaessa aina lukutilassa
  if (findJulkaisuWithTila(julkaisut, odottaaHyvaksyntaaTila)) {
    return MuokkausTila.LUKU;
  }
  // Uudelleenkuuluttaessa muokataan, jos ei olla odottamassa hyväksyntää
  if (kuulutus.uudelleenKuulutus) {
    return MuokkausTila.MUOKKAUS;
  }
  // Jos löytyy hyväksytty kuulutus, ollaan lukutilassa. Muuten muokkaustilassa.
  if (findJulkaisuWithTila(julkaisut, hyvaksyttyTila)) {
    return MuokkausTila.LUKU;
  }
  return MuokkausTila.MUOKKAUS;
}
