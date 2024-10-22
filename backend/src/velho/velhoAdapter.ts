import { ProjektiTyyppi, VelhoHakuTulos, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { DBProjekti, KasittelynTila, LinkitettyVelhoProjekti, Velho } from "../database/model";
import { adaptKayttaja } from "../personSearch/personAdapter";
import { Kayttajas } from "../personSearch/kayttajas";
import {
  ProjektiProjekti,
  ProjektiProjektiGeometrycollection,
  ProjektiProjektiLuontiMitattugeometriaGeometria,
  ProjektiProjektiLuontiOminaisuudet,
  ProjektiProjektiLuontiOminaisuudetHyvaksymispaatos,
  ProjektiProjektiLuontiOminaisuudetKorkeinHallintoOikeus,
  ProjektiProjektiLuontiOminaisuudetVarahenkilo,
  ProjektiProjektiLuontiOminaisuudetVastuuhenkilo,
  ProjektiProjektiLuontiOminaisuudetVaylamuotoEnum,
} from "./projektirekisteri";
import mergeWith from "lodash/mergeWith";
import pickBy from "lodash/pickBy";
import identity from "lodash/identity";
import isArray from "lodash/isArray";
import cloneDeep from "lodash/cloneDeep";
import difference from "lodash/difference";
import { kuntametadata } from "hassu-common/kuntametadata";
import { log } from "../logger";
import { assertIsDefined } from "../util/assertions";
import { IllegalArgumentError } from "hassu-common/error";
import { parseDate } from "../util/dateUtil";
import isEqual from "lodash/isEqual";
import { asianhallintaService } from "../asianhallinta/asianhallintaService";
import { isProjektiAsianhallintaIntegrationEnabled } from "../util/isProjektiAsianhallintaIntegrationEnabled";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";

let metaDataJSON: any;

function getMetadataJSON() {
  if (!metaDataJSON) {
    metaDataJSON = require("./metadata.json");
  }
  return metaDataJSON;
}

function extractVelhoValuesIntoMap(field: string): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const definition = getMetadataJSON().info["x-velho-nimikkeistot"][field];
  const keyTitleMap = definition.nimikkeistoversiot[definition["uusin-nimikkeistoversio"]];
  Object.keys(keyTitleMap).forEach((key) => {
    values[key] = { otsikko: keyTitleMap[key].otsikko, kategoria: keyTitleMap[key].kategoria };
  });
  return values;
}

const metadata = (() => {
  const tilat = extractVelhoValuesIntoMap("projekti/tila");
  const vaiheet = extractVelhoValuesIntoMap("projekti/vaihe");
  const organisaatiot = extractVelhoValuesIntoMap("projekti/organisaatio");
  const toteutusAjankohdat = extractVelhoValuesIntoMap("projekti/arvioitu-toteutusajankohta");
  const dokumenttiTyypit = extractVelhoValuesIntoMap("aineisto/dokumenttityyppi");
  return { tilat, vaiheet, organisaatiot, toteutusAjankohdat, dokumenttiTyypit };
})();

function adaptVaylamuoto(vaylamuodot: Set<ProjektiProjektiLuontiOminaisuudetVaylamuotoEnum>) {
  const values: string[] = [];
  vaylamuodot.forEach((value) => values.push(`${value}`));
  return values;
}

export type ProjektiSearchResult = Pick<ProjektiProjekti, "oid"> & {
  ominaisuudet: Pick<
    ProjektiProjektiLuontiOminaisuudet,
    "nimi" | "vastuuhenkilo" | "asiatunnus-vaylavirasto" | "asiatunnus-ely" | "tilaajaorganisaatio"
  > & { vaihe: ProjektiVaihe };
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
  readonly [O in Organisaatio]: SuunnittelustaVastaavaViranomainen;
};

const organisaatioToViranomainen: OrganisaatioToViranomainen = {
  "organisaatio/org01": SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
  "organisaatio/org02": SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
  "organisaatio/org03": SuunnittelustaVastaavaViranomainen.VARSINAIS_SUOMEN_ELY,
  "organisaatio/org04": SuunnittelustaVastaavaViranomainen.KAAKKOIS_SUOMEN_ELY,
  "organisaatio/org05": SuunnittelustaVastaavaViranomainen.PIRKANMAAN_ELY,
  "organisaatio/org06": SuunnittelustaVastaavaViranomainen.POHJOIS_SAVON_ELY,
  "organisaatio/org07": SuunnittelustaVastaavaViranomainen.KESKI_SUOMEN_ELY,
  "organisaatio/org08": SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY,
  "organisaatio/org09": SuunnittelustaVastaavaViranomainen.POHJOIS_POHJANMAAN_ELY,
  "organisaatio/org10": SuunnittelustaVastaavaViranomainen.LAPIN_ELY,
  "organisaatio/org11": SuunnittelustaVastaavaViranomainen.MUU,
} as const;

const numberSorter = (a: number, b: number) => a - b;

function getViranomainen(organisaatio: Organisaatio) {
  return organisaatioToViranomainen[organisaatio];
}

function getAsiatunnus(hakutulos: ProjektiSearchResult) {
  const suunnittelustaVastaavaViranomainen = getViranomainen(hakutulos.ominaisuudet.tilaajaorganisaatio as any);
  const asiatunnusELY = hakutulos.ominaisuudet["asiatunnus-ely"];
  const asiatunnusVayla = hakutulos.ominaisuudet["asiatunnus-vaylavirasto"];
  return suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO ? asiatunnusVayla : asiatunnusELY;
}

export function adaptSearchResults(searchResults: ProjektiSearchResult[], kayttajas: Kayttajas): VelhoHakuTulos[] {
  if (searchResults) {
    return searchResults.map((result) => {
      const projektiPaallikko = kayttajas.findByEmail(getVastuuhenkiloEmail(result.ominaisuudet.vastuuhenkilo));
      let projektiPaallikkoNimi: string | undefined;
      if (projektiPaallikko) {
        const user = adaptKayttaja(projektiPaallikko);
        projektiPaallikkoNimi = user.sukunimi + " " + user.etunimi;
      }
      const tyyppi = getProjektiTyyppi(result.ominaisuudet.vaihe);
      const asiatunnus = getAsiatunnus(result);
      const hakutulos: VelhoHakuTulos = {
        __typename: "VelhoHakuTulos",
        oid: result.oid,
        nimi: result.ominaisuudet.nimi,
        tyyppi,
        projektiPaallikko: projektiPaallikkoNimi,
        asiatunnus,
      };
      return hakutulos;
    });
  }
  return [];
}

function getVastuuhenkiloEmail(
  vastuuhenkilo: ProjektiProjektiLuontiOminaisuudetVastuuhenkilo | ProjektiProjektiLuontiOminaisuudetVarahenkilo | null
): string {
  if (vastuuhenkilo?.sahkoposti) {
    return vastuuhenkilo?.sahkoposti;
  }
  // Support the data based on the old schema
  return vastuuhenkilo as unknown as string;
}

function getKunnat(data: ProjektiProjekti): number[] | undefined {
  if (data.ominaisuudet.kunta) {
    const kunnat: number[] = [];
    data.ominaisuudet.kunta.forEach((kuntaVelhoKey) => {
      const kuntaId = parseNumberIdFromVelhoKey(kuntaVelhoKey as unknown as string);
      if (!kuntametadata.kuntaForKuntaId(kuntaId)) {
        log.error("Velhosta saatua kuntaa ei löydy: " + kuntaId);
      } else {
        kunnat.push(kuntaId);
      }
    });
    return kunnat.sort(numberSorter);
  }
  try {
    return data.ominaisuudet["muu-kunta"]
      ?.split(",")
      .map((s) => s.trim())
      .map(kuntametadata.idForKuntaName)
      .sort();
  } catch (e) {
    log.error("Virheellinen muu-kunta: '" + data.ominaisuudet["muu-kunta"] + "'");
    return undefined;
  }
}

function getMaakunnat(data: ProjektiProjekti) {
  if (data.ominaisuudet.maakunta) {
    const maakunnat: number[] = [];
    data.ominaisuudet.maakunta.forEach((maakuntaVelhoKey) => {
      const maakuntaId = parseNumberIdFromVelhoKey(maakuntaVelhoKey as unknown as string);
      if (!kuntametadata.maakuntaForMaakuntaId(maakuntaId)) {
        log.error("Velhosta saatua maakuntaa ei löydy: " + maakuntaId);
      } else {
        maakunnat.push(maakuntaId);
      }
    });
    return maakunnat.sort(numberSorter);
  }
  try {
    return data.ominaisuudet["muu-maakunta"]
      ?.split(",")
      .map((s) => s.trim())
      .map(kuntametadata.idForMaakuntaName)
      .sort();
  } catch (e) {
    log.error("Virheellinen muu-maakunta: '" + data.ominaisuudet["muu-maakunta"] + "'");
    return undefined;
  }
}

function getLinkitetytProjektit(data: ProjektiProjekti[]): LinkitettyVelhoProjekti[] {
  const linkitetytProjektit: LinkitettyVelhoProjekti[] = [];
  data.forEach((projekti) =>
    linkitetytProjektit.push({
      nimi: projekti.ominaisuudet.nimi,
      oid: projekti.oid,
      tyyppi: getProjektiTyyppi(projekti.ominaisuudet.vaihe as any),
    })
  );
  return linkitetytProjektit;
}

export async function adaptProjekti(data: ProjektiProjekti, linkitetytProjektit?: ProjektiProjekti[]): Promise<DBProjekti> {
  const projektiTyyppi = getProjektiTyyppi(data.ominaisuudet.vaihe as any);
  const viranomainen = getViranomainen(data.ominaisuudet.tilaajaorganisaatio as any);
  const vastuuhenkilonEmail = getVastuuhenkiloEmail(data.ominaisuudet.vastuuhenkilo);
  const varahenkilonEmail = getVastuuhenkiloEmail(data.ominaisuudet.varahenkilo);

  const projekti: DBProjekti = {
    oid: "" + data.oid,
    versio: 1,
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
      linkitetytProjektit: linkitetytProjektit ? getLinkitetytProjektit(linkitetytProjektit) : null,
    },
    kasittelynTila: adaptKasittelynTilaFromVelho(data.ominaisuudet),
    kayttoOikeudet: [],
  };

  const asiaId =
    process.env.MIGRATION_CLI === "true" || (await isProjektiAsianhallintaIntegrationEnabled(projekti))
      ? await haeAsiaId(projekti)
      : undefined;

  await persistGeoJsonFile(data);

  projekti.asianhallinta = { inaktiivinen: false, asiaId };

  return projekti;
}

async function haeAsiaId(projekti: DBProjekti) {
  try {
    return await asianhallintaService.getAsiaIdByProjekti(projekti);
  } catch (e) {
    log.info("asiaId:tä ei voitu hakea", { error: e });
    return undefined;
  }
}

async function persistGeoJsonFile(data: ProjektiProjekti) {
  const geoJSON = getGeoJSON(data);
  const fileName = "sijaintitieto/sijaintitieto.geojson";
  if (geoJSON) {
    log.info("Tallennetaan sijaintitieto geoJSON-tiedostoon");
    await fileService.createFileToProjekti({
      oid: data.oid,
      fileName,
      path: new ProjektiPaths(data.oid),
      contents: Buffer.from(geoJSON, "utf-8"),
      contentType: "application/geo+json",
    });
  } else {
    log.info("Poistetaan sijaintitieto geoJSON-tiedosto");
    await fileService.deleteYllapitoFileFromProjekti({
      filePathInProjekti: "/" + fileName,
      oid: data.oid,
      reason: "Velhossa ei ole sijaintitietoja",
    });
  }
}

function getGeoJSON(data: ProjektiProjekti): string | null {
  const geometrycollection = data.geometrycollection?.geometries;
  const geometriaEiOleKeskipiste = (geometry: ProjektiProjektiLuontiMitattugeometriaGeometria): boolean =>
    !isEqual(geometry, data.keskipiste?.["geometria-wgs84"]);
  const muutGeometriat = geometrycollection?.filter(geometriaEiOleKeskipiste);

  // Jos on muitakin geometrioita kuin keskipiste, suodatetaan keskipisteet pois
  const geometries = muutGeometriat?.length ? muutGeometriat : geometrycollection;

  // Jos geometrioita ei ole, palautetaan null
  if (!geometries?.length) {
    return null;
  }

  const geometry: ProjektiProjektiGeometrycollection = {
    type: "GeometryCollection",
    geometries,
  };

  const geoJSON = {
    type: "Feature",
    geometry,
  };

  const geoJsonString = JSON.stringify(geoJSON);

  return geoJsonString;
}

export function adaptDokumenttiTyyppi(dokumenttiTyyppi: string): { dokumenttiTyyppi: string; kategoria: string } {
  const type = metadata.dokumenttiTyypit[dokumenttiTyyppi] as undefined | { otsikko: string; kategoria: string };
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

function setIfDefined<T>(value: T | undefined | null, setValue: (value: T) => void) {
  if (value) {
    setValue(value);
  }
}

function adaptKasittelynTilaFromVelho(ominaisuudet: ProjektiProjektiLuontiOminaisuudet): KasittelynTila | undefined {
  const kasittelynTila: KasittelynTila = {};
  kasittelynTila.suunnitelmanTila = objectToString(ominaisuudet["hallinnollisen-kasittelyn-tila"]);
  kasittelynTila.ennakkoneuvotteluPaiva = objectToString(ominaisuudet["ennakkoneuvottelu"]);
  kasittelynTila.hyvaksymisesitysTraficomiinPaiva = objectToString(ominaisuudet["hyvaksymisesitys"]?.lahetetty);
  kasittelynTila.ennakkotarkastus = objectToString(ominaisuudet["hyvaksymisesitys"]?.saapunut);
  const hyvaksymispaatos = ominaisuudet.hyvaksymispaatos;
  if (hyvaksymispaatos) {
    kasittelynTila.hyvaksymispaatos = kasittelynTila.hyvaksymispaatos ?? {};
    kasittelynTila.hyvaksymispaatos.paatoksenPvm = objectToString(hyvaksymispaatos.annettu);
    kasittelynTila.hyvaksymispaatos.asianumero = objectToString(ominaisuudet["asiatunnus-traficom"]);
    if (hyvaksymispaatos.jatkopaatos?.["ensimmainen-annettu"]) {
      kasittelynTila.ensimmainenJatkopaatos = kasittelynTila.ensimmainenJatkopaatos ?? {};
      kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm = objectToString(hyvaksymispaatos.jatkopaatos["ensimmainen-annettu"]);
    }
    if (hyvaksymispaatos.jatkopaatos?.["toinen-annettu"]) {
      kasittelynTila.toinenJatkopaatos = kasittelynTila.toinenJatkopaatos ?? {};
      kasittelynTila.toinenJatkopaatos.paatoksenPvm = objectToString(hyvaksymispaatos.jatkopaatos["toinen-annettu"]);
    }
  }

  setIfDefined(ominaisuudet.lainvoimaisuus?.alkaen, (value) => (kasittelynTila.lainvoimaAlkaen = objectToString(value)));
  setIfDefined(ominaisuudet.lainvoimaisuus?.paattyen, (value) => (kasittelynTila.lainvoimaPaattyen = objectToString(value)));
  setIfDefined(ominaisuudet["valitukset"], (value) => (kasittelynTila.valitustenMaara = value));
  setIfDefined(
    ominaisuudet.liikenteeseenluovutus?.osittain,
    (value) => (kasittelynTila.liikenteeseenluovutusOsittain = objectToString(value[0]))
  );
  setIfDefined(
    ominaisuudet.liikenteeseenluovutus?.kokonaan,
    (value) => (kasittelynTila.liikenteeseenluovutusKokonaan = objectToString(value))
  );
  setIfDefined(ominaisuudet.toteutusilmoitus?.osittain, (value) => (kasittelynTila.toteutusilmoitusOsittain = objectToString(value[0])));
  setIfDefined(ominaisuudet.toteutusilmoitus?.kokonaan, (value) => (kasittelynTila.toteutusilmoitusKokonaan = objectToString(value)));
  setIfDefined(ominaisuudet.lisatiedot, (value) => (kasittelynTila.lisatieto = objectToString(value)));
  setIfDefined(ominaisuudet["vaylatoimitus-kaynnistynyt"], (value) => (kasittelynTila.toimitusKaynnistynyt = objectToString(value)));

  // Palauta tyhjälle lopputulokselle undefined
  if (isEqual(pickBy(kasittelynTila, identity), {})) {
    return undefined;
  }
  return kasittelynTila;
}

export function applyKasittelyntilaToVelho(projekti: ProjektiProjekti, params: KasittelynTila): ProjektiProjekti {
  const ominaisuudet = projekti.ominaisuudet;
  setIfDefined(params.suunnitelmanTila, (value) => (ominaisuudet["hallinnollisen-kasittelyn-tila"] = stringToObject(value)));
  setIfDefined(params.ennakkoneuvotteluPaiva, (value) => (ominaisuudet["ennakkoneuvottelu"] = toLocalDate(value)));
  setIfDefined(
    params.hyvaksymisesitysTraficomiinPaiva,
    (value) =>
      (ominaisuudet["hyvaksymisesitys"] = {
        lahetetty: toLocalDate(value),
        saapunut: params.ennakkotarkastus ? toLocalDate(params.ennakkotarkastus) : ominaisuudet["hyvaksymisesitys"]?.saapunut ?? null,
      })
  );

  if (params.hyvaksymispaatos || params.ensimmainenJatkopaatos || params.toinenJatkopaatos) {
    const defaultHyvaksymisPaatos: ProjektiProjektiLuontiOminaisuudetHyvaksymispaatos = {
      jatkopaatos: null,
      annettu: null,
      "palautettu-laatijalle": null,
      osapaatos: null,
    };
    ominaisuudet.hyvaksymispaatos = ominaisuudet.hyvaksymispaatos ?? defaultHyvaksymisPaatos;
    const hyvaksymispaatos = ominaisuudet.hyvaksymispaatos;
    assertIsDefined(hyvaksymispaatos);
    setIfDefined(params.hyvaksymispaatos?.paatoksenPvm, (value) => (hyvaksymispaatos.annettu = toLocalDate(value)));
    setIfDefined(params.hyvaksymispaatos?.asianumero, (value) => (ominaisuudet["asiatunnus-traficom"] = value));
    if (params.ensimmainenJatkopaatos?.paatoksenPvm) {
      if (!hyvaksymispaatos.jatkopaatos) {
        hyvaksymispaatos.jatkopaatos = {
          "ensimmainen-annettu": toLocalDate(params.ensimmainenJatkopaatos.paatoksenPvm),
          "toinen-annettu": null,
        };
      } else {
        hyvaksymispaatos.jatkopaatos["ensimmainen-annettu"] = toLocalDate(params.ensimmainenJatkopaatos.paatoksenPvm);
      }

      if (params.toinenJatkopaatos?.paatoksenPvm) {
        if (!hyvaksymispaatos.jatkopaatos) {
          throw new IllegalArgumentError("Ei voi tallentaa toista jatkopäätöstä ennen ensimmäistä");
        }
        hyvaksymispaatos.jatkopaatos["toinen-annettu"] = toLocalDate(params.toinenJatkopaatos.paatoksenPvm);
      }

      if (params.lainvoimaAlkaen && params.lainvoimaPaattyen) {
        ominaisuudet.lainvoimaisuus = { alkaen: toLocalDate(params.lainvoimaAlkaen), paattyen: toLocalDate(params.lainvoimaPaattyen) };
      }
    }
    if (params.korkeinHallintoOikeus?.hyvaksymisPaatosKumottu !== undefined) {
      const kho: ProjektiProjektiLuontiOminaisuudetKorkeinHallintoOikeus = {
        "hyvaksymispaatos-kumottu": params.korkeinHallintoOikeus.hyvaksymisPaatosKumottu,
        paatos: null,
        valipaatos: null,
      };
      setIfDefined(
        params.korkeinHallintoOikeus.valipaatos,
        (value) =>
          (kho["valipaatos"] = {
            annettu: value.paiva ? toLocalDate(value.paiva) : null,
            sisalto: value.sisalto ?? null,
          })
      );
      setIfDefined(
        params.korkeinHallintoOikeus.paatos,
        (value) =>
          (kho["paatos"] = {
            annettu: value.paiva ? toLocalDate(value.paiva) : null,
            sisalto: value.sisalto ?? null,
          })
      );
      ominaisuudet["korkein-hallinto-oikeus"] = kho;
    }
    if (params.hallintoOikeus?.hyvaksymisPaatosKumottu !== undefined) {
      const ho: ProjektiProjektiLuontiOminaisuudetKorkeinHallintoOikeus = {
        "hyvaksymispaatos-kumottu": params.hallintoOikeus.hyvaksymisPaatosKumottu,
        paatos: null,
        valipaatos: null,
      };
      setIfDefined(
        params.hallintoOikeus.valipaatos,
        (value) =>
          (ho["valipaatos"] = {
            annettu: value.paiva ? toLocalDate(value.paiva) : null,
            sisalto: value.sisalto ?? null,
          })
      );
      setIfDefined(
        params.hallintoOikeus.paatos,
        (value) =>
          (ho["paatos"] = {
            annettu: value.paiva ? toLocalDate(value.paiva) : null,
            sisalto: value.sisalto ?? null,
          })
      );
      ominaisuudet["hallinto-oikeus"] = ho;
    }
  }

  setIfDefined(params.valitustenMaara, (value) => (ominaisuudet["valitukset"] = value));

  if (params.liikenteeseenluovutusOsittain || params.liikenteeseenluovutusKokonaan) {
    ominaisuudet.liikenteeseenluovutus = {
      osittain: params.liikenteeseenluovutusOsittain ? [toLocalDate(params.liikenteeseenluovutusOsittain)] : null,
      kokonaan: params.liikenteeseenluovutusKokonaan ? toLocalDate(params.liikenteeseenluovutusKokonaan) : null,
    };
  }
  if (params.toteutusilmoitusOsittain || params.toteutusilmoitusKokonaan) {
    ominaisuudet.toteutusilmoitus = {
      osittain: params.toteutusilmoitusOsittain ? [toLocalDate(params.toteutusilmoitusOsittain)] : null,
      kokonaan: params.toteutusilmoitusKokonaan ? toLocalDate(params.toteutusilmoitusKokonaan) : null,
    };
  }
  setIfDefined(params.lisatieto, (value) => (ominaisuudet.lisatiedot = value));
  setIfDefined(params.lainvoimaAlkaen, (value) => {
    ominaisuudet["lainvoimaisuus"] = {
      alkaen: toLocalDate(value),
      paattyen: params.lainvoimaPaattyen ? toLocalDate(params.lainvoimaPaattyen) : ominaisuudet["lainvoimaisuus"]?.paattyen ?? null,
    };
  });
  setIfDefined(params.toimitusKaynnistynyt, (value) => {
    ominaisuudet["vaylatoimitus-kaynnistynyt"] = toLocalDate(value);
  });
  return projekti;
}

export function applyAloitusKuulutusPaivaToVelho(projekti: ProjektiProjekti, kuulutusPaiva: string | undefined): ProjektiProjekti {
  setIfDefined(kuulutusPaiva, (value) => (projekti.ominaisuudet["aloituskuulutus"] = toLocalDate(value)));
  return projekti;
}

export function applySuunnittelunTilaToVelho(projekti: ProjektiProjekti, suunnitelmanTila: string): ProjektiProjekti {
  projekti.ominaisuudet["hallinnollisen-kasittelyn-tila"] = stringToObject(suunnitelmanTila);
  return projekti;
}

function toLocalDate(date: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return parseDate(date).startOf("day").format() as unknown as object;
}

function stringToObject(s: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return s as unknown as object;
}

function objectToString<T>(s: unknown): T | undefined {
  if (s == undefined) {
    return undefined;
  }
  // eslint-disable-next-line @typescript-eslint/ban-types
  return s as unknown as T;
}

function parseNumberIdFromVelhoKey(key: string): number {
  const match = key.match(/\w+\/[a-z]+(\d+)/);
  if (match && match.length == 2) {
    const val = Number.parseInt(match[1]);
    if (!isNaN(val)) {
      return val;
    }
  }
  throw new Error("Could not parse number from key:" + key);
}
