import { DBProjekti } from "../database/model/projekti";
import {
  ProjektiHakutulosDokumentti,
  ProjektiRooli,
  ProjektiTyyppi,
  Status,
  Viranomainen,
} from "../../../common/graphql/apiModel";
import { projektiAdapter } from "../handler/projektiAdapter";
import dayjs from "dayjs";

export type ProjektiDocument = {
  oid: string;
  nimi?: string;
  asiatunnus?: string;
  maakunnat?: string[];
  vaylamuoto?: string[];
  suunnittelustaVastaavaViranomainen?: Viranomainen;
  vaihe?: Status;
  projektiTyyppi?: ProjektiTyyppi;
  paivitetty?: string;
  projektipaallikko?: string;
  muokkaajat?: string[];
};

export function adaptProjektiToIndex(projekti: DBProjekti): Partial<ProjektiDocument> {
  const apiProjekti = projektiAdapter.applyStatus(projektiAdapter.adaptProjekti(projekti), { saved: true });

  return {
    nimi: projekti.velho.nimi,
    asiatunnus: projekti.velho.asiatunnusELY || projekti.velho.asiatunnusVayla || "",
    projektiTyyppi: projekti.velho.tyyppi,
    suunnittelustaVastaavaViranomainen: projekti.velho.suunnittelustaVastaavaViranomainen,
    maakunnat: projekti.velho.maakunnat,
    vaihe: apiProjekti.status,
    vaylamuoto: projekti.velho.vaylamuoto,
    projektipaallikko: projekti.kayttoOikeudet
      .filter((value) => value.rooli == ProjektiRooli.PROJEKTIPAALLIKKO)
      .map((value) => value.nimi)
      .pop(),
    paivitetty: projekti.paivitetty || dayjs().format(),
    muokkaajat: projekti.kayttoOikeudet.map((value) => value.kayttajatunnus),
  };
}

export function adaptSearchResultsToProjektiDocuments(results: any): ProjektiDocument[] {
  if ((results.status && results.status >= 400) || !results.hits?.hits) {
    return [];
  }
  return results.hits.hits.map((hit: any) => {
    return { ...hit._source, oid: hit._id } as ProjektiDocument;
  });
}

export function adaptSearchResultsToProjektiHakutulosDokumenttis(results: any): ProjektiHakutulosDokumentti[] {
  if (results.status && results.status >= 400) {
    throw new Error("Projektihaussa tapahtui virhe");
  }
  return (
    results.hits?.hits?.map((hit: any) => {
      return { ...hit._source, oid: hit._id, __typename: "ProjektiHakutulosDokumentti" } as ProjektiHakutulosDokumentti;
    }) || []
  );
}
