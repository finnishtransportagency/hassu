import { Status, VelhoHakuTulos } from "../../../common/graphql/apiModel";
import { ProjektiProjekti, ProjektiProjektiOminaisuudetVaylamuotoEnum } from "./projektirekisteri";
import { DBProjekti } from "../database/model/projekti";

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

export function adaptSearchResults(searchResults: any): VelhoHakuTulos[] {
  if (searchResults) {
    return searchResults.map((result: any) => {
      return {
        oid: result.oid,
        nimi: result.ominaisuudet.nimi,
        tyyppi: result.ominaisuudet.vaylamuoto,
      } as VelhoHakuTulos;
    });
  }
  return [];
}

export function adaptProjekti(data: ProjektiProjekti): { projekti: DBProjekti; vastuuhenkilo: string } {
  const projekti: DBProjekti = {
    oid: "" + data.oid,
    tila: metadata.tilat[`${data.ominaisuudet.tila}`],
    tyyppi: metadata.vaiheet[`${data.ominaisuudet.vaihe}`],
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
