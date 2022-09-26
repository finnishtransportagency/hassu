import { ProjektiTyyppi, VelhoHakuTulos, Viranomainen } from "../../../common/graphql/apiModel";
import { DBProjekti, Velho } from "../database/model";
import { adaptKayttaja } from "../personSearch/personAdapter";
import { Kayttajas } from "../personSearch/kayttajas";
import {
  ProjektiProjekti,
  ProjektirekisteriApiV2ProjektiOminaisuudet,
  ProjektirekisteriApiV2ProjektiOminaisuudetVarahenkilo,
  ProjektirekisteriApiV2ProjektiOminaisuudetVastuuhenkilo,
  ProjektirekisteriApiV2ProjektiOminaisuudetVaylamuotoEnum,
} from "./projektirekisteri";
import mergeWith from "lodash/mergeWith";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";
import isArray from "lodash/isArray";
import cloneDeep from "lodash/cloneDeep";
import difference from "lodash/difference";
import { log } from "../logger";

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
    return (values[key] = { otsikko: keyTitleMap[key].otsikko, kategoria: keyTitleMap[key].kategoria });
  });
  return values;
}

const metadata = (() => {
  const tilat = extractValuesIntoMap("projekti/tila");
  const vaiheet = extractValuesIntoMap("projekti/vaihe");
  const organisaatiot = extractValuesIntoMap("projekti/organisaatio");
  const toteutusAjankohdat = extractValuesIntoMap("projekti/arvioitu-toteutusajankohta");
  const dokumenttiTyypit = extractValuesIntoMap("aineisto/dokumenttityyppi");
  return { tilat, vaiheet, organisaatiot, toteutusAjankohdat, dokumenttiTyypit };
})();

function adaptVaylamuoto(vaylamuodot: Set<ProjektirekisteriApiV2ProjektiOminaisuudetVaylamuotoEnum>) {
  const values: string[] = [];
  vaylamuodot.forEach((value) => values.push(`${value}`));
  return values;
}

export type ProjektiSearchResult = Pick<ProjektiProjekti, "oid"> & {
  ominaisuudet: Pick<ProjektirekisteriApiV2ProjektiOminaisuudet, "nimi" | "vastuuhenkilo"> & { vaihe: ProjektiVaihe };
};

type ProjektiVaihe = "vaihe/vaihe04" | "vaihe/vaihe10" | "vaihe/vaihe12";
type Organisaatio =
  | "organisaatio/org01"
  | "organisaatio/org02"
  | "organisaatio/org03"
  | "organisaatio/org04"
  | "organisaatio/org05"
  | "organisaatio/org06"
  | "organisaatio/org07"
  | "organisaatio/org08"
  | "organisaatio/org09"
  | "organisaatio/org10"
  | "organisaatio/org11";

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

type OrganisaatioToViranomainen = {
  readonly [O in Organisaatio]: Viranomainen;
};

const organisaatioToViranomainen: OrganisaatioToViranomainen = {
  "organisaatio/org01": Viranomainen.VAYLAVIRASTO,
  "organisaatio/org02": Viranomainen.UUDENMAAN_ELY,
  "organisaatio/org03": Viranomainen.VARSINAIS_SUOMEN_ELY,
  "organisaatio/org04": Viranomainen.KAAKKOIS_SUOMEN_ELY,
  "organisaatio/org05": Viranomainen.PIRKANMAAN_ELY,
  "organisaatio/org06": Viranomainen.POHJOIS_SAVON_ELY,
  "organisaatio/org07": Viranomainen.KESKI_SUOMEN_ELY,
  "organisaatio/org08": Viranomainen.ETELA_POHJANMAAN_ELY,
  "organisaatio/org09": Viranomainen.POHJOIS_POHJANMAAN_ELY,
  "organisaatio/org10": Viranomainen.LAPIN_ELY,
  "organisaatio/org11": Viranomainen.MUU,
} as const;

function getViranomainen(organisaatio: Organisaatio) {
  return organisaatioToViranomainen[organisaatio];
}

export function adaptSearchResults(searchResults: ProjektiSearchResult[], kayttajas: Kayttajas): VelhoHakuTulos[] {
  if (searchResults) {
    return searchResults.map((result) => {
      const projektiPaallikko = kayttajas.findByEmail(getVastuuhenkiloEmail(result.ominaisuudet.vastuuhenkilo));
      const projektiPaallikkoNimi = projektiPaallikko ? adaptKayttaja(projektiPaallikko).nimi : undefined;
      const tyyppi = getProjektiTyyppi(result.ominaisuudet.vaihe);
      const hakutulos: VelhoHakuTulos = {
        __typename: "VelhoHakuTulos",
        oid: result.oid,
        nimi: result.ominaisuudet.nimi,
        tyyppi,
        projektiPaallikko: projektiPaallikkoNimi,
      };
      return hakutulos;
    });
  }
  return [];
}

function getVastuuhenkiloEmail(
  vastuuhenkilo: ProjektirekisteriApiV2ProjektiOminaisuudetVastuuhenkilo | ProjektirekisteriApiV2ProjektiOminaisuudetVarahenkilo
): string {
  if (vastuuhenkilo?.sahkoposti) {
    return vastuuhenkilo?.sahkoposti;
  }
  // Support the data based on the old schema
  return vastuuhenkilo as unknown as string;
}

function getKunnat(data: ProjektiProjekti) {
  if (data.ominaisuudet.kunta) {
    log.info({ kunta: data.ominaisuudet.kunta }); // TODO add support for object type when we have test data available
  }
  return data.ominaisuudet["muu-kunta"]?.split(",");
}

function getMaakunnat(data: ProjektiProjekti) {
  if (data.ominaisuudet.maakunta) {
    log.info({ maakunta: data.ominaisuudet.maakunta }); // TODO add support for object type when we have test data available
  }
  return data.ominaisuudet["muu-maakunta"]?.split(",");
}

export function adaptProjekti(data: ProjektiProjekti): DBProjekti {
  const projektiTyyppi = getProjektiTyyppi(data.ominaisuudet.vaihe as any);
  const viranomainen = getViranomainen(data.ominaisuudet.tilaajaorganisaatio as any);
  const vastuuhenkilonEmail = getVastuuhenkiloEmail(data.ominaisuudet.vastuuhenkilo);
  const varahenkilonEmail = getVastuuhenkiloEmail(data.ominaisuudet.varahenkilo);
  return {
    oid: "" + data.oid,
    tyyppi: projektiTyyppi,
    velho: {
      nimi: data.ominaisuudet.nimi,
      tyyppi: projektiTyyppi,
      vaylamuoto: adaptVaylamuoto(data.ominaisuudet.vaylamuoto),
      suunnittelustaVastaavaViranomainen: viranomainen,
      linkki: data.ominaisuudet.linkki,
      kunnat: getKunnat(data),
      maakunnat: getMaakunnat(data),
      vastuuhenkilonEmail,
      varahenkilonEmail,
      asiatunnusVayla: data.ominaisuudet["asiatunnus-vaylavirasto"],
      asiatunnusELY: data.ominaisuudet["asiatunnus-ely"],
    },
    kayttoOikeudet: [],
  };
}

export function adaptDokumenttiTyyppi(dokumenttiTyyppi: string): { dokumenttiTyyppi: string; kategoria: string } {
  const type = metadata.dokumenttiTyypit[dokumenttiTyyppi];
  if (!type) {
    throw new Error("adaptDokumenttiTyyppi: tyyppiä ${dokumenttiTyyppi} ei löydy metadata.dokumenttiTyypit avaimista.");
  }
  return {
    dokumenttiTyyppi: type.otsikko,
    kategoria: type.kategoria,
  };
}

export function findUpdatedFields(oldVelho: Velho, newVelho: Velho): Velho {
  const modifiedFields = mergeWith(cloneDeep(newVelho), oldVelho, (newValue, oldValue) => {
    if (isArray(newValue) || isArray(oldValue)) {
      return difference(newValue, oldValue).length > 0 ? newValue : null;
    }
    if (newValue == oldValue) {
      return null;
    }
    return newValue;
  });
  return pickBy(modifiedFields, identity) as Velho;
}
