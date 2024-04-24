import axios from "axios";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { parseStringPromise as parseString } from "xml2js";
import { auditLog, log } from "../logger";
import { chunkArray } from "../database/chunkArray";
import { FeatureCollection } from "geojson";
import lookup from "country-code-lookup";

type Yhteystieto = {
  jakeluosoite?: string | null;
  postinumero?: string | null;
  paikkakunta?: string | null;
  maakoodi?: string | null;
};

export type Omistaja = {
  id?: number;
  etunimet?: string;
  sukunimi?: string;
  nimi?: string;
  henkilotunnus?: string;
  ytunnus?: string;
  yhteystiedot?: Yhteystieto;
};

export type MmlKiinteisto = {
  kiinteistotunnus?: string;
  kayttooikeusyksikkotunnus?: string;
  omistajat: Omistaja[];
};

export type MmlClient = {
  haeLainhuutotiedot: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
  haeYhteystiedot: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
  haeTiekunnat: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
  haeYhteisalueet: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
};

export type MmlOptions = {
  ogcEndpoint: string;
  endpoint: string;
  apiKey: string;
  ogcApiKey: string;
};

const TIMEOUT = 120000;
const MAX = 100;

export function getMmlClient(options: MmlOptions): MmlClient {
  return {
    haeLainhuutotiedot: async (kiinteistotunnukset: string[], uid: string, debug = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const tunneksetVastaus = [...kiinteistotunnukset];
      const tunnukset = [...kiinteistotunnukset];
      do {
        const kyselytunnukset = tunnukset.splice(0, MAX);
        const url = options.endpoint + "/lainhuutotiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
        log.info("haeLainhuutotiedot url: " + url);
        auditLog.info("Lainhuutotietojen haku", { kiinteistotunnukset: kyselytunnukset });
        const response = await axios.get(url, { headers: { "x-api-key": options.apiKey, enduserid: uid }, timeout: TIMEOUT });
        if (debug) {
          console.log("rawdata: %s", response.data.replaceAll("\n", ""));
        }
        const responseJson = await parseString(response.data);
        if (responseJson["kylh:Lainhuutotiedot"]["kylh:Rekisteriyksikko"]) {
          for (const yksikko of responseJson["kylh:Lainhuutotiedot"]["kylh:Rekisteriyksikko"]) {
            const omistajat: Omistaja[] = [];
            const kiinteistotunnus = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["y:kiinteistotunnus"][0];
            if (yksikko["trlh:lainhuudot"][0]["trlh:Lainhuutoasia"]) {
              for (const asia of yksikko["trlh:lainhuudot"][0]["trlh:Lainhuutoasia"]) {
                // Ratkaistu tai Loppuunsaatettu
                if ((asia["y:asianTila"][0] === "02" || asia["y:asianTila"][0] === "03") && asia["trlh:osuudetAsianKohteesta"]) {
                  for (const kohde of asia["trlh:osuudetAsianKohteesta"][0]["trlh:OsuusAsianKohteesta"]) {
                    for (const hlo of kohde["y:osuudenHenkilot"][0]["y:Henkilo"]) {
                      const tiedot = hlo["y:henkilonTiedot"][0];
                      omistajat.push({
                        henkilotunnus: tiedot["y:henkilotunnus"] ? tiedot["y:henkilotunnus"][0] : undefined,
                        etunimet: tiedot["y:etunimet"] ? tiedot["y:etunimet"][0] : undefined,
                        sukunimi: tiedot["y:sukunimi"] ? tiedot["y:sukunimi"][0] : undefined,
                        ytunnus: tiedot["y:ytunnus"] ? tiedot["y:ytunnus"][0] : undefined,
                        nimi: tiedot["y:nimi"] ? tiedot["y:nimi"][0] : undefined,
                      });
                    }
                  }
                }
              }
            }
            yhteystiedot.push({ kiinteistotunnus, omistajat });
            const idx = tunneksetVastaus.indexOf(kiinteistotunnus);
            if (idx !== -1) {
              tunneksetVastaus.splice(idx, 1);
            }
          }
        }
      } while (tunnukset.length > 0);
      // lisätään tyhjä entry tunnuksille joita ei jostain syystä löydy rajapinnasta
      for (const kiinteistotunnus of tunneksetVastaus) {
        yhteystiedot.push({ kiinteistotunnus, omistajat: [] });
      }
      return yhteystiedot;
    },
    haeYhteystiedot: async (kiinteistotunnukset: string[], uid: string, debug = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const tunneksetVastaus = [...kiinteistotunnukset];
      const tunnukset = [...kiinteistotunnukset];
      do {
        const kyselytunnukset = tunnukset.splice(0, MAX);
        const url = options.endpoint + "/yhteystiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
        log.info("haeYhteystiedot url: " + url);
        auditLog.info("Yhteystietojen haku", { kiinteistotunnukset: kyselytunnukset });
        const response = await axios.get(url, { headers: { "x-api-key": options.apiKey, enduserid: uid }, timeout: TIMEOUT });
        if (debug) {
          console.log("rawdata: %s", response.data.replaceAll("\n", ""));
        }
        const responseJson = await parseString(response.data);
        if (responseJson["kyyh:Yhteystiedot"]["tryh:Rekisteriyksikko"]) {
          for (const yksikko of responseJson["kyyh:Yhteystiedot"]["tryh:Rekisteriyksikko"]) {
            const omistajat: Omistaja[] = [];
            const kiinteistotunnus = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["y:kiinteistotunnus"][0];
            if (yksikko["tryh:kohteenHenkilot"][0]["y:Henkilo"]) {
              for (const hlo of yksikko["tryh:kohteenHenkilot"][0]["y:Henkilo"]) {
                const tiedot = hlo["y:henkilonTiedot"][0];
                const osoite = hlo["muti:Osoite"] ? hlo["muti:Osoite"][0] : undefined;
                omistajat.push({
                  etunimet: tiedot["y:etunimet"] ? tiedot["y:etunimet"][0] : undefined,
                  sukunimi: tiedot["y:sukunimi"] ? tiedot["y:sukunimi"][0] : undefined,
                  nimi: tiedot["y:nimi"] ? tiedot["y:nimi"][0] : undefined,
                  yhteystiedot: {
                    jakeluosoite: osoite && osoite["muti:jakeluosoite"] ? osoite["muti:jakeluosoite"][0] : undefined,
                    paikkakunta: osoite && osoite["muti:paikkakunta"] ? osoite["muti:paikkakunta"][0] : undefined,
                    postinumero: osoite && osoite["muti:postinumero"] ? osoite["muti:postinumero"][0] : undefined,
                    maakoodi: osoite && osoite["muti:maakoodi"] ? lookup.byIso(osoite["muti:maakoodi"][0])?.iso2 : undefined,
                  },
                });
              }
            }
            yhteystiedot.push({ kiinteistotunnus, omistajat });
            const idx = tunneksetVastaus.indexOf(kiinteistotunnus);
            if (idx !== -1) {
              tunneksetVastaus.splice(idx, 1);
            }
          }
        }
      } while (tunnukset.length > 0);
      // lisätään tyhjä entry tunnuksille joita ei jostain syystä löydy rajapinnasta
      for (const kiinteistotunnus of tunneksetVastaus) {
        yhteystiedot.push({ kiinteistotunnus, omistajat: [] });
      }
      return yhteystiedot;
    },
    haeTiekunnat: async (kiinteistotunnukset, uid, debug = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      for (const kyselytunnukset of chunks) {
        let url =
          options.ogcEndpoint +
          "/collections/KayttooikeusyksikonPerustiedot/items?kiinteistotunnus=" +
          kyselytunnukset.join(",") +
          "&tiekunnallisuus=1";
        log.info("haeTiekunnat url: " + url);
        let response = await axios.get(url, {
          // TODO: Vaihda x-api-key:ksi kun rajapinta Väyläpilvessä
          headers: { Authorization: "Basic " + Buffer.from(options.ogcApiKey).toString("base64"), enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        let geojson = response.data as FeatureCollection;
        const tiekuntaMap = new Map<number, Omistaja>();
        for (const feat of geojson.features) {
          if (feat.properties?.tiekunta) {
            yhteystiedot.push({
              kayttooikeusyksikkotunnus: feat.properties.kayttooikeusyksikkotunnus,
              omistajat: feat.properties.tiekunta.map((t: { nimi: string; id: number }) => {
                const omistaja = { id: t.id, nimi: t.nimi };
                tiekuntaMap.set(t.id, omistaja);
                return omistaja;
              }),
            });
          }
        }
        url = options.ogcEndpoint + "/collections/TiekunnanYhteystiedot/items?id=" + [...tiekuntaMap.keys()].join(",");
        log.info("haeTiekunnanYhteystiedot url: " + url);
        response = await axios.get(url, {
          // TODO: Vaihda x-api-key:ksi kun rajapinta Väyläpilvessä
          headers: { Authorization: "Basic " + Buffer.from(options.ogcApiKey).toString("base64"), enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        geojson = response.data as FeatureCollection;
        for (const feat of geojson.features) {
          if (feat?.properties?.yhteyshenkilo[0]) {
            const omistaja = tiekuntaMap.get(feat.id as number);
            if (omistaja) {
              omistaja.nimi = feat.properties.yhteyshenkilo[0].nimi;
              omistaja.yhteystiedot = {
                jakeluosoite: feat.properties.yhteyshenkilo[0].osoite[0]?.osoite,
                postinumero: feat.properties.yhteyshenkilo[0].osoite[0]?.postinumero,
                paikkakunta: feat.properties.yhteyshenkilo[0].osoite[0]?.postitoimipaikka,
                maakoodi: feat.properties.yhteyshenkilo[0].osoite[0]?.valtio
                  ? lookup.byIso(feat.properties.yhteyshenkilo[0].osoite[0].valtio)?.iso2
                  : undefined,
              };
            }
          }
        }
      }
      return yhteystiedot;
    },
    haeYhteisalueet: async (kiinteistotunnukset, uid, debug = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      for (const kyselytunnukset of chunks) {
        const url =
          options.ogcEndpoint + "/collections/RekisteriyksikonYhteisalueosuudet/items?kiinteistotunnus=" + kyselytunnukset.join(",");
        log.info("haeYhteisalueet url: " + url);
        const response = await axios.get(url, {
          // TODO: Vaihda x-api-key:ksi kun rajapinta Väyläpilvessä
          headers: { Authorization: "Basic " + Buffer.from(options.ogcApiKey).toString("base64"), enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        const geojson = response.data as FeatureCollection;
        for (const feat of geojson.features) {
          for (const alue of feat.properties?.yhteisalueosuus ?? []) {
            yhteystiedot.push({
              kiinteistotunnus: alue.yhteisalueyksikko.kiinteistotunnus,
              omistajat: [{ nimi: alue.yhteisalueyksikko.nimi }],
            });
          }
        }
      }
      return yhteystiedot;
    },
  };
}
