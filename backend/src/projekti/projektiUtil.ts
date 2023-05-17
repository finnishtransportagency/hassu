import { DBVaylaUser, IlmoituksenVastaanottajat, NahtavillaoloVaiheJulkaisu, UudelleenKuulutus, Velho } from "../database/model";
import { parseDate } from "../util/dateUtil";
import { assertIsDefined } from "../util/assertions";
import * as API from "../../../common/graphql/apiModel";
import { VelhoJulkinen, SuunnittelustaVastaavaViranomainen } from "../../../common/graphql/apiModel";

export interface GenericKuulutus {
  id: number;
  tila?: API.KuulutusJulkaisuTila | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  palautusSyy?: string | null;
}

export interface GenericVaihe {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat;
}

export type GenericDbKuulutusJulkaisu = Pick<
  NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus" | "hyvaksymisPaiva" | "id" | "hyvaksyja"
>;

export type GenericApiKuulutusJulkaisu = Pick<
  API.NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus"
>;

export function findJulkaisutWithTila<J extends GenericKuulutus>(
  julkaisut: J[] | undefined | null,
  tila: API.KuulutusJulkaisuTila,
  sort: ((a: J, b: J) => number) | undefined = sortByKuulutusPaivaAsc
): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila)?.sort(sort);
}

export function findJulkaisuWithTila<J extends GenericKuulutus>(
  julkaisut: J[] | undefined | null,
  tila: API.KuulutusJulkaisuTila
): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}

export function sortByKuulutusPaivaAsc<T extends GenericDbKuulutusJulkaisu>(julkaisu1: T, julkaisu2: T): number {
  assertIsDefined(julkaisu1.kuulutusPaiva);
  assertIsDefined(julkaisu2.kuulutusPaiva);
  return parseDate(julkaisu1.kuulutusPaiva).unix() - parseDate(julkaisu2.kuulutusPaiva).unix();
}

export function sortByKuulutusPaivaDesc<T extends GenericDbKuulutusJulkaisu>(julkaisu1: T, julkaisu2: T): number {
  assertIsDefined(julkaisu2.kuulutusPaiva);
  assertIsDefined(julkaisu1.kuulutusPaiva);
  return parseDate(julkaisu2.kuulutusPaiva).unix() - parseDate(julkaisu1.kuulutusPaiva).unix();
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

export function getAsiatunnus(velho: Velho | VelhoJulkinen | null | undefined): string | undefined {
  if (!velho) {
    return undefined;
  }
  return (
    (velho.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
      ? velho.asiatunnusVayla
      : velho.asiatunnusELY) || undefined
  );
}
