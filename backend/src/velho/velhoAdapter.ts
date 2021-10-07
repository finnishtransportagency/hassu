import { Projekti, VelhoHakuTulos } from "../api/apiModel";
import { ProjektiProjekti, ProjektiProjektiOminaisuudetVaylamuotoEnum } from "./projektirekisteri";
// @ts-ignore
import { default as metadataJson } from "./metadata.json";

function extractValuesIntoMap(field: string) {
  const values = {};
  const definition = metadataJson.info["x-velho-nimikkeistot"][field];
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
  const values = [];
  vaylamuodot.forEach((value) => values.push(`${value}`));
  return values;
}

export function adaptSearchResults(searchResults: any): VelhoHakuTulos[] {
  if (searchResults) {
    return searchResults.map((result) => {
      return {
        oid: result.oid,
        nimi: result.ominaisuudet.nimi,
        tyyppi: result.ominaisuudet.vaylamuoto,
      } as VelhoHakuTulos;
    });
  }
}

export function adaptProjecti(data: ProjektiProjekti, isInDatabase?: boolean): Projekti {
  return {
    __typename: "Projekti",
    oid: "" + data.oid,
    tila: metadata.tilat[`${data.ominaisuudet.tila}`],
    tyyppi: metadata.vaiheet[`${data.ominaisuudet.vaihe}`],
    nimi: data.ominaisuudet.nimi,
    vaylamuoto: adaptVaylamuoto(data.ominaisuudet.vaylamuoto),
    organisaatio: metadata.organisaatiot[`${data.ominaisuudet.tilaajaorganisaatio}`],
    toteutusAjankohta: metadata.toteutusAjankohdat[`${data.ominaisuudet["arvioitu-toteutusajankohta"]}`],
    tallennettu: !!isInDatabase,
  };
}
