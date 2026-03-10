import {
  AineistoMuokkaus,
  DBVaylaUser,
  IlmoituksenVastaanottajat,
  NahtavillaoloVaiheJulkaisu,
  UudelleenKuulutus,
  Velho,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
} from "../database/model";
import { nyt, parseDate } from "../util/dateUtil";
import { assertIsDefined } from "../util/assertions";
import * as API from "hassu-common/graphql/apiModel";
import { SuunnittelustaVastaavaViranomainen, VelhoJulkinen } from "hassu-common/graphql/apiModel";

export interface GenericKuulutus {
  id: number;
  tila?: API.KuulutusJulkaisuTila | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  aineistoMuokkaus?: AineistoMuokkaus | null;
  palautusSyy?: string | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
}

export interface GenericVaihe {
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
}

export type GenericDbKuulutusJulkaisu = Pick<
  NahtavillaoloVaiheJulkaisu,
  | "tila"
  | "kuulutusPaiva"
  | "kuulutusVaihePaattyyPaiva"
  | "uudelleenKuulutus"
  | "hyvaksymisPaiva"
  | "id"
  | "hyvaksyja"
  | "ilmoituksenVastaanottajat"
  | "asianhallintaEventId"
  | "aineistoMuokkaus"
  | "yhteystiedot"
  | "kuulutusYhteystiedot"
  | "muokkaaja"
>;

export type GenericApiKuulutusJulkaisu = Pick<
  API.NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "uudelleenKuulutus" | "aineistoMuokkaus" | "ilmoituksenVastaanottajat"
>;

export function findJulkaisutWithTila<J extends Pick<GenericDbKuulutusJulkaisu, "tila" | "kuulutusPaiva">>(
  julkaisut: J[] | undefined | null,
  tila: API.KuulutusJulkaisuTila,
  sort: ((a: J, b: J) => number) | undefined = sortByKuulutusPaivaAsc
): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila)?.sort(sort);
}

export function findJulkaisuWithTila<J extends Pick<GenericDbKuulutusJulkaisu, "tila" | "kuulutusPaiva">>(
  julkaisut: J[] | undefined | null,
  tila: API.KuulutusJulkaisuTila
): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}

export function findJulkaisuWithAsianhallintaEventId<
  J extends {
    asianhallintaEventId?: string | null;
  }
>(julkaisut: J[] | undefined | null, asianhallintaEventId: string | null | undefined): J | undefined {
  if (!julkaisut || !asianhallintaEventId) {
    return;
  }
  return julkaisut.filter((julkaisu) => julkaisu.asianhallintaEventId == asianhallintaEventId)?.pop();
}

export function sortByKuulutusPaivaAsc<T extends Pick<GenericDbKuulutusJulkaisu, "tila" | "kuulutusPaiva">>(
  julkaisu1: T,
  julkaisu2: T
): number {
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

export function findUserByKayttajatunnus(
  kayttoOikeudet: DBVaylaUser[],
  kayttajatunnus: string | null | undefined
): DBVaylaUser | undefined {
  if (!kayttajatunnus) {
    return undefined;
  }
  return kayttoOikeudet.find((value) => value.kayttajatunnus == kayttajatunnus);
}

export function adaptMuokkausTila(kuulutus: GenericKuulutus, julkaisut: GenericDbKuulutusJulkaisu[] | null | undefined): API.MuokkausTila {
  // Hyväksyntää odottaessa aina lukutilassa
  if (findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA)) {
    return API.MuokkausTila.LUKU;
  }
  // Jos aineistoMuokkaus on päällä ja yksikään julkaisu ei odota hyväksyntää, tila on aineistomuokkaus
  if (kuulutus.aineistoMuokkaus) {
    const kuulutusPaiva = julkaisut?.length ? julkaisut[julkaisut.length - 1].kuulutusPaiva : null;
    if (kuulutusPaiva && parseDate(kuulutusPaiva)?.isBefore(nyt())) {
      return API.MuokkausTila.LUKU;
    } else {
      return API.MuokkausTila.AINEISTO_MUOKKAUS;
    }
  }
  // Jos aineistomuokkaus ei ole päällä, yksikään julkaisu odota hyväksyntää ja uudelleenkuulutus on päällä, ollaan muokkaustilassa
  if (kuulutus.uudelleenKuulutus) {
    return API.MuokkausTila.MUOKKAUS;
  }
  // Jos viimeisin julkaisu on migroitu, on tila migroitu
  if (julkaisut?.length && julkaisut[julkaisut.length - 1].tila === API.KuulutusJulkaisuTila.MIGROITU) {
    return API.MuokkausTila.MIGROITU;
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
      : velho.asiatunnusELY) ?? undefined
  );
}

export function findAloitusKuulutusWaitingForApproval(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
  if (projekti.aloitusKuulutusJulkaisut) {
    return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  }
}

export function findNahtavillaoloWaitingForApproval(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  }
}

export function findHyvaksymisPaatosVaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
  if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  }
}

export function findJatkoPaatos1VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
  if (projekti.jatkoPaatos1VaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.jatkoPaatos1VaiheJulkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  }
}

export function findJatkoPaatos2VaiheWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
  if (projekti.jatkoPaatos2VaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.jatkoPaatos2VaiheJulkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  }
}

export function findAloitusKuulutusLastApproved(projekti: DBProjekti): AloitusKuulutusJulkaisu | undefined {
  if (projekti.aloitusKuulutusJulkaisut) {
    return findJulkaisuWithTila(projekti.aloitusKuulutusJulkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY);
  }
}

export function findHyvaksymisKuulutusLastApproved(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
  if (projekti.hyvaksymisPaatosVaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.hyvaksymisPaatosVaiheJulkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY);
  }
}

export function findHJatko1KuulutusLastApproved(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
  if (projekti.jatkoPaatos1VaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.jatkoPaatos1VaiheJulkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY);
  }
}

export function findHJatko2KuulutusLastApproved(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
  if (projekti.jatkoPaatos2VaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.jatkoPaatos2VaiheJulkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY);
  }
}

export function findNahtavillaoloLastApproved(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    return findJulkaisuWithTila(projekti.nahtavillaoloVaiheJulkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY);
  }
}
