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
  kayttooikeusyksikkotunnus?: string;
  etunimet?: string;
  sukunimi?: string;
  nimi?: string;
  henkilotunnus?: string;
  ytunnus?: string;
  kuolinpvm?: string;
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
  ogcApiExamples: string;
};

const TIMEOUT = 120000;
const MAX = 100;
const CONCURRENT_MAX = 10;

export function getMmlClient(options: MmlOptions): MmlClient {
  return {
    haeLainhuutotiedot: async (kiinteistotunnukset: string[], uid: string, debug = false) => {
      const all: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      for (const chunk of chunks) {
        const responses: Promise<MmlKiinteisto[]>[] = [];
        for (const kyselytunnukset of chunkArray(chunk, CONCURRENT_MAX)) {
          responses.push(
            new Promise((resolve: (yhteystiedot: MmlKiinteisto[]) => void) => {
              const yhteystiedot: MmlKiinteisto[] = [];
              const url = options.endpoint + "/lainhuutotiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
              log.info("haeLainhuutotiedot url: " + url);
              auditLog.info("Lainhuutotietojen haku", { kiinteistotunnukset: kyselytunnukset });
              const vastaustunnukset = [...kyselytunnukset];
              axios.get(url, { headers: { "x-api-key": options.apiKey, enduserid: uid }, timeout: TIMEOUT }).then((response) => {
                if (debug) {
                  console.log("rawdata: %s", response.data.replaceAll("\n", ""));
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                parseString(response.data).then((responseJson: any) => {
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
                                  kuolinpvm: tiedot["y:kuolinpvm"] ? tiedot["y:kuolinpvm"][0] : undefined,
                                });
                              }
                            }
                          }
                        }
                      }
                      const idx = vastaustunnukset.indexOf(kiinteistotunnus);
                      if (idx !== -1) {
                        vastaustunnukset.splice(idx, 1);
                      }
                      yhteystiedot.push({ kiinteistotunnus, omistajat });
                    }
                  }
                  for (const kiinteistotunnus of vastaustunnukset) {
                    yhteystiedot.push({ kiinteistotunnus, omistajat: [] });
                  }
                  resolve(yhteystiedot);
                });
              });
            })
          );
        }
        all.push(...(await Promise.all(responses)).flat());
      }
      return all;
    },
    haeYhteystiedot: async (kiinteistotunnukset: string[], uid: string, debug = false) => {
      const all: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      for (const chunk of chunks) {
        const responses: Promise<MmlKiinteisto[]>[] = [];
        for (const kyselytunnukset of chunkArray(chunk, CONCURRENT_MAX)) {
          responses.push(
            new Promise((resolve: (yhteystiedot: MmlKiinteisto[]) => void) => {
              const yhteystiedot: MmlKiinteisto[] = [];
              const url = options.endpoint + "/yhteystiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
              log.info("haeYhteystiedot url: " + url);
              auditLog.info("Yhteystietojen haku", { kiinteistotunnukset: kyselytunnukset });
              const vastaustunnukset = [...kyselytunnukset];
              axios.get(url, { headers: { "x-api-key": options.apiKey, enduserid: uid }, timeout: TIMEOUT }).then((response) => {
                if (debug) {
                  console.log("rawdata: %s", response.data.replaceAll("\n", ""));
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                parseString(response.data).then((responseJson: any) => {
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
                      const idx = vastaustunnukset.indexOf(kiinteistotunnus);
                      if (idx !== -1) {
                        vastaustunnukset.splice(idx, 1);
                      }
                      yhteystiedot.push({ kiinteistotunnus, omistajat });
                    }
                    for (const kiinteistotunnus of vastaustunnukset) {
                      yhteystiedot.push({ kiinteistotunnus, omistajat: [] });
                    }
                    resolve(yhteystiedot);
                  }
                });
              });
            })
          );
        }
        all.push(...(await Promise.all(responses)).flat());
      }
      return all;
    },
    haeTiekunnat: async (kiinteistotunnukset, uid, debug = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      const tiekuntaMap = new Map<number, Omistaja>();
      for (const kyselytunnukset of chunks) {
        let url =
          options.ogcEndpoint +
          "/collections/KayttooikeusyksikonPerustiedot/items?kiinteistotunnus=" +
          kyselytunnukset.join(",") +
          "&tiekunnallisuus=1";
        auditLog.info("Tiekuntien haku", { kiinteistotunnukset: kyselytunnukset });
        let response = await axios.get(url, {
          headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        let geojson = response.data as FeatureCollection | undefined;
        const ids: number[] = [];
        for (const feat of geojson?.features || []) {
          if (feat.properties?.tiekunta) {
            feat.properties.tiekunta.forEach((t: { nimi: string; id: number }) => {
              const omistaja = { id: t.id, nimi: t.nimi, kayttooikeusyksikkotunnus: feat.properties?.kayttooikeusyksikkotunnus };
              if (!tiekuntaMap.has(t.id)) {
                tiekuntaMap.set(t.id, omistaja);
                ids.push(t.id);
              }
            });
          }
        }
        url = options.ogcEndpoint + "/collections/TiekunnanYhteystiedot/items?id=" + ids.join(",");
        if (options.ogcApiExamples === "true") {
          url = url.replace("/features/", "/examples/");
        }
        auditLog.info("Tiekuntien yhteystietojen haku", { ids, url });
        response = await axios.get(url, {
          headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        geojson = response.data as FeatureCollection | undefined;
        for (const feat of geojson?.features ?? []) {
          if (feat?.properties?.yhteyshenkilo[0]) {
            const omistaja = tiekuntaMap.get(feat.id as number);
            if (omistaja && !omistaja.yhteystiedot) {
              // tiekunnan nimi sulkuihin
              omistaja.nimi = feat.properties.yhteyshenkilo[0].nimi + (omistaja.nimi ? " (" + omistaja.nimi + ")" : "");
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
      for (const yhteyshenkilo of tiekuntaMap.values()) {
        yhteystiedot.push({
          kayttooikeusyksikkotunnus: yhteyshenkilo.kayttooikeusyksikkotunnus,
          omistajat: [{ nimi: yhteyshenkilo.nimi, yhteystiedot: yhteyshenkilo.yhteystiedot }],
        });
      }
      return yhteystiedot;
    },
    haeYhteisalueet: async (kiinteistotunnukset, uid, debug = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      const alueMap = new Map<string, MmlKiinteisto>();
      for (const kyselytunnukset of chunks) {
        const url =
          options.ogcEndpoint + "/collections/RekisteriyksikonYhteisalueosuudet/items?kiinteistotunnus=" + kyselytunnukset.join(",");
        auditLog.info("Yhteisalueiden haku", { kiinteistotunnukset: kyselytunnukset });
        const response = await axios.get(url, {
          headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        const geojson = response.data as FeatureCollection;
        for (const feat of geojson.features) {
          for (const alue of feat.properties?.yhteisalueosuus ?? []) {
            if (!alueMap.has(alue.yhteisalueyksikko.kiinteistotunnus)) {
              alueMap.set(alue.yhteisalueyksikko.kiinteistotunnus, {
                kiinteistotunnus: alue.yhteisalueyksikko.kiinteistotunnus,
                omistajat: [{ nimi: alue.yhteisalueyksikko.nimi }],
              });
            }
          }
        }
      }
      yhteystiedot.push(...alueMap.values());
      return yhteystiedot;
    },
  };
}
