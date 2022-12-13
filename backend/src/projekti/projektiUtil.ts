import { AloitusKuulutusJulkaisu, DBVaylaUser, NahtavillaoloVaiheJulkaisu, UudelleenKuulutus } from "../database/model";
import { parseDate } from "../util/dateUtil";
import { assertIsDefined } from "../util/assertions";
import { KuulutusJulkaisuTila, MuokkausTila } from "../../../common/graphql/apiModel";

export type GenericKuulutus = {
  tila?: KuulutusJulkaisuTila | null | undefined;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
};

export type GenericKuulutusJulkaisu = Pick<
  AloitusKuulutusJulkaisu & NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus" | "hyvaksymisPaiva"
>;

export function findJulkaisutWithTila<J extends GenericKuulutusJulkaisu>(
  julkaisut: J[] | undefined | null,
  tila: KuulutusJulkaisuTila
): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila)?.sort(sortMostRecentkuulutusLast);
}

export function findJulkaisuWithTila<J extends GenericKuulutusJulkaisu>(
  julkaisut: J[] | undefined | null,
  tila: KuulutusJulkaisuTila
): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}

function sortMostRecentkuulutusLast<J extends GenericKuulutusJulkaisu>(julkaisu1: J, julkaisu2: J) {
  assertIsDefined(julkaisu1.kuulutusPaiva);
  assertIsDefined(julkaisu2.kuulutusPaiva);
  return parseDate(julkaisu1.kuulutusPaiva).unix() - parseDate(julkaisu2.kuulutusPaiva).unix();
}

export function findJulkaisuWithId<J extends GenericKuulutusJulkaisu>(
  julkaisut: (J & { id?: number })[] | undefined | null,
  id: number
): J | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.id == id).pop();
}

export function findUserByKayttajatunnus(kayttoOikeudet: DBVaylaUser[], kayttajatunnus: string | undefined): DBVaylaUser | undefined {
  if (!kayttajatunnus) {
    return undefined;
  }
  return kayttoOikeudet.find((value) => value.kayttajatunnus == kayttajatunnus);
}

export function adaptMuokkausTila<J extends GenericKuulutusJulkaisu>(kuulutus: J, julkaisut: J[] | null | undefined): MuokkausTila {
  // Migroitu on aina migroitu, ei luku- eikä muokkaustila
  if (findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.MIGROITU)) {
    return MuokkausTila.MIGROITU;
  }
  // Hyväksyntää odottaessa aina lukutilassa
  if (findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA)) {
    return MuokkausTila.LUKU;
  }
  // Uudelleenkuuluttaessa muokataan, jos ei olla odottamassa hyväksyntää
  if (kuulutus.uudelleenKuulutus) {
    return MuokkausTila.MUOKKAUS;
  }
  // Jos löytyy hyväksytty kuulutus, ollaan lukutilassa. Muuten muokkaustilassa.
  if (findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY)) {
    return MuokkausTila.LUKU;
  }
  return MuokkausTila.MUOKKAUS;
}
