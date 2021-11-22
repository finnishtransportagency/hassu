import { Kayttaja, ProjektiTyyppi, Status, VelhoHakuTulos } from "../../../common/graphql/apiModel";
import {
  ProjektiProjekti,
  ProjektiProjektiOminaisuudet,
  ProjektiProjektiOminaisuudetVaylamuotoEnum,
} from "./projektirekisteri";
import { DBProjekti } from "../database/model/projekti";
import { adaptKayttaja } from "../personSearch/personAdapter";
import { hasPermissionLuonti } from "../service/userService";

let metaDataJSON: any;

function getMetadataJSON() {
  if (!metaDataJSON) {
    metaDataJSON = require("./metadata.json");
  }
  return metaDataJSON;
}

function extractValuesIntoMap(field: string) {
  const values: any = {};
  const definition: any = (getMetadataJSON().info["x-velho-nimikkeistot"] as any)[field];
  const keyTitleMap = definition.nimikkeistoversiot[definition["uusin-nimikkeistoversio"]];
  Object.keys(keyTitleMap).forEach((key) => {
    return (values[key] = keyTitleMap[key].otsikko);
  });
  return values;
}

const metadata = (() => {
  const tilat = extractValuesIntoMap("projekti/tila");
  const vaiheet = extractValuesIntoMap("projekti/vaihe");
  const organisaatiot = extractValuesIntoMap("projekti/organisaatio");
  const toteutusAjankohdat = extractValuesIntoMap("projekti/arvioitu-toteutusajankohta");
  return { tilat, vaiheet, organisaatiot, toteutusAjankohdat };
})();

function adaptVaylamuoto(vaylamuodot: Set<ProjektiProjektiOminaisuudetVaylamuotoEnum>) {
  const values: string[] = [];
  vaylamuodot.forEach((value) => values.push(`${value}`));
  return values;
}

export type ProjektiSearchResult = Pick<ProjektiProjekti, "oid"> & {
  ominaisuudet: Pick<ProjektiProjektiOminaisuudet, "nimi" | "vastuuhenkilo"> & { vaihe: ProjektiVaihe };
};

type ProjektiVaihe = "vaihe/vaihe04" | "vaihe/vaihe10" | "vaihe/vaihe12";

type ProjektiVaiheToTyyppi = {
  readonly [PV in ProjektiVaihe]: ProjektiTyyppi;
};

const projektiVaiheToTyyppi: ProjektiVaiheToTyyppi = {
  "vaihe/vaihe04": ProjektiTyyppi.YLEINEN,
  "vaihe/vaihe10": ProjektiTyyppi.TIE,
  "vaihe/vaihe12": ProjektiTyyppi.RATA,
} as const;

function getProjektiTyyppi(vaihe: ProjektiVaihe) {
  return projektiVaiheToTyyppi[vaihe];
}

export function adaptSearchResults(searchResults: ProjektiSearchResult[], kayttajat: Kayttaja[]): VelhoHakuTulos[] {
  if (searchResults) {
    return searchResults.map((result) => {
      const projektiPaallikko = kayttajat.find((kayttaja) => kayttaja.email === result.ominaisuudet.vastuuhenkilo);
      const projektiPaallikkoNimi =
        projektiPaallikko && hasPermissionLuonti(projektiPaallikko) ? adaptKayttaja(projektiPaallikko).nimi : undefined;
      const tyyppi = getProjektiTyyppi(result.ominaisuudet.vaihe);
      return {
        oid: result.oid,
        nimi: result.ominaisuudet.nimi,
        tyyppi,
        projektiPaallikko: projektiPaallikkoNimi,
      } as VelhoHakuTulos;
    });
  }
  return [];
}

export function adaptProjekti(data: ProjektiProjekti): { projekti: DBProjekti; vastuuhenkilo: string } {
  const projekti: DBProjekti = {
    oid: "" + data.oid,
    tila: metadata.tilat[`${data.ominaisuudet.tila}`], // TODO: lisää hakuehtoihin vain Aktiivinen
    tyyppi: getProjektiTyyppi(data.ominaisuudet.vaihe as any),
    nimi: data.ominaisuudet.nimi,
    status: Status.EI_JULKAISTU,
    vaylamuoto: adaptVaylamuoto(data.ominaisuudet.vaylamuoto),
    organisaatio: metadata.organisaatiot[`${data.ominaisuudet.tilaajaorganisaatio}`],
    kayttoOikeudet: [],
  };
  // @ts-ignore
  projekti.toteutusAjankohta = metadata.toteutusAjankohdat[data.ominaisuudet["arvioitu-toteutusajankohta"]];

  return {
    projekti,
    vastuuhenkilo: data.ominaisuudet.vastuuhenkilo,
  };
}
