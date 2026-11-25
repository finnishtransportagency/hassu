// Contains code generated or recommended by Amazon Q
import axios from "axios";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { parseStringPromise as parseString } from "xml2js";
import { auditLog, log } from "../logger";
import { chunkArray } from "../database/chunkArray";
import { Feature, FeatureCollection } from "geojson";
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
  tiekuntaKunta?: string;
};

export type MmlKiinteisto = {
  kiinteistotunnus?: string;
  kayttooikeusyksikkotunnus?: string;
  omistajat: Omistaja[];
};

export type MmlClient = {
  haeLainhuutotiedot: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
  haeYhteystiedot: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
  haeTiekunnat: (bbox: number[], uid: string, debug?: boolean, skipYhteystiedot?: boolean) => Promise<MmlKiinteisto[]>;
  haeRantakunnat: (bbox: number[], uid: string, debug?: boolean, skipYhteystiedot?: boolean) => Promise<MmlKiinteisto[]>;
  haeYhteisalueet: (kiinteistotunnukset: string[], uid: string, debug?: boolean) => Promise<MmlKiinteisto[]>;
  haeMaaraalat: (
    bbox: number[],
    uid: string,
    debug?: boolean,
    excludeKiinteistotunnukset?: string[],
    skipYhteystiedot?: boolean
  ) => Promise<MmlKiinteisto[]>;
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

function isUnknownCollectionError(e: unknown): boolean {
  const data = (e as { response?: { data?: { code?: string; description?: string } } })?.response?.data;
  const isUnknown = data?.code === "400" && data?.description === "Unknown collection";
  if (!isUnknown && (e as { response?: unknown })?.response) {
    log.warn("OGC-kutsu epäonnistui", {
      status: (e as { response?: { status?: number } })?.response?.status,
      url: (e as { config?: { url?: string } })?.config?.url,
      data,
    });
  }
  return isUnknown;
}

export function createMmlClient(options: MmlOptions): MmlClient {
  const client: MmlClient = {
    haeLainhuutotiedot: async (kiinteistotunnukset: string[], uid: string, debug = false) => {
      const all: MmlKiinteisto[] = [];
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      for (const chunk of chunks) {
        const responses: Promise<MmlKiinteisto[]>[] = [];
        for (const kyselytunnukset of chunkArray(chunk, CONCURRENT_MAX)) {
          responses.push(
            new Promise((resolve: (yhteystiedot: MmlKiinteisto[]) => void, reject) => {
              const yhteystiedot: MmlKiinteisto[] = [];
              const url = options.endpoint + "/lainhuutotiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
              log.info("haeLainhuutotiedot url: " + url);
              auditLog.info("Lainhuutotietojen haku", { kiinteistotunnukset: kyselytunnukset });
              const vastaustunnukset = [...kyselytunnukset];
              axios
                .get(url, { headers: { "x-api-key": options.apiKey, enduserid: uid }, timeout: TIMEOUT })
                .then((response) => {
                  if (debug) {
                    console.log("rawdata: %s", response.data.replaceAll("\n", ""));
                  }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  parseString(response.data).then((responseJson: any) => {
                    if (responseJson["kylh:Lainhuutotiedot"]["kylh:Rekisteriyksikko"]) {
                      for (const yksikko of responseJson["kylh:Lainhuutotiedot"]["kylh:Rekisteriyksikko"]) {
                        const omistajat: Omistaja[] = [];
                        const kiinteistotunnus = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["y:kiinteistotunnus"][0];
                        let nimi;
                        if (yksikko["trpt:rekisteriyksikonPerustiedot"][0]["trpt:nimi"]) {
                          nimi = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["trpt:nimi"][0];
                        }
                        if (yksikko["trlh:lainhuudot"][0]["trlh:Lainhuutoasia"]) {
                          for (const asia of yksikko["trlh:lainhuudot"][0]["trlh:Lainhuutoasia"]) {
                            // Ratkaistu tai Loppuunsaatettu
                            if (
                              (asia["y:asianTila"][0] === "02" || asia["y:asianTila"][0] === "03") &&
                              asia["trlh:osuudetAsianKohteesta"]
                            ) {
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
                        } else if (nimi) {
                          omistajat.push({
                            nimi,
                          });
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
                })
                .catch(reject);
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
            new Promise((resolve: (yhteystiedot: MmlKiinteisto[]) => void, reject) => {
              const yhteystiedot: MmlKiinteisto[] = [];
              const url = options.endpoint + "/yhteystiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
              log.info("haeYhteystiedot url: " + url);
              auditLog.info("Yhteystietojen haku", { kiinteistotunnukset: kyselytunnukset });
              const vastaustunnukset = [...kyselytunnukset];
              axios
                .get(url, { headers: { "x-api-key": options.apiKey, enduserid: uid }, timeout: TIMEOUT })
                .then((response) => {
                  if (debug) {
                    console.log("rawdata: %s", response.data.replaceAll("\n", ""));
                  }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  parseString(response.data).then((responseJson: any) => {
                    if (responseJson["kyyh:Yhteystiedot"]["tryh:Rekisteriyksikko"]) {
                      for (const yksikko of responseJson["kyyh:Yhteystiedot"]["tryh:Rekisteriyksikko"]) {
                        const omistajat: Omistaja[] = [];
                        const kiinteistotunnus = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["y:kiinteistotunnus"][0];
                        let nimi;
                        if (yksikko["trpt:rekisteriyksikonPerustiedot"][0]["trpt:nimi"]) {
                          nimi = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["trpt:nimi"][0];
                        }
                        if (yksikko["tryh:kohteenHenkilot"][0]["y:Henkilo"]) {
                          for (const hlo of yksikko["tryh:kohteenHenkilot"][0]["y:Henkilo"]) {
                            const tiedot = hlo["y:henkilonTiedot"][0];
                            const osoite = hlo["muti:Osoite"] ? hlo["muti:Osoite"][0] : undefined;
                            omistajat.push({
                              etunimet: tiedot["y:etunimet"] ? tiedot["y:etunimet"][0] : undefined,
                              sukunimi: tiedot["y:sukunimi"] ? tiedot["y:sukunimi"][0] : undefined,
                              nimi: tiedot["y:nimi"] ? tiedot["y:nimi"][0] : undefined,
                              ytunnus: tiedot["y:ytunnus"] ? tiedot["y:ytunnus"][0] : undefined,
                              yhteystiedot: {
                                jakeluosoite: osoite && osoite["muti:jakeluosoite"] ? osoite["muti:jakeluosoite"][0] : undefined,
                                paikkakunta: osoite && osoite["muti:paikkakunta"] ? osoite["muti:paikkakunta"][0] : undefined,
                                postinumero: osoite && osoite["muti:postinumero"] ? osoite["muti:postinumero"][0] : undefined,
                                maakoodi: osoite && osoite["muti:maakoodi"] ? lookup.byIso(osoite["muti:maakoodi"][0])?.iso2 : undefined,
                              },
                            });
                          }
                        } else if (nimi) {
                          omistajat.push({
                            nimi,
                          });
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
                })
                .catch(reject);
            })
          );
        }
        all.push(...(await Promise.all(responses)).flat());
      }
      return all;
    },
    haeTiekunnat: async (bbox, uid, debug = false, skipYhteystiedot = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const tiekuntaMap = new Map<number, Omistaja>();
      const bboxParam = bbox.join(",");
      const url = options.ogcEndpoint + "/collections/KayttooikeusyksikonOsanSijaintitiedot/items?bbox=" + bboxParam + "&tiekunnallisuus=1";
      log.info("haeTiekunnat url: " + url);
      auditLog.info("Tiekuntien haku bbox:llä", { bbox });
      try {
        const response = await axios.get(url, {
          headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        const geojson = response.data as FeatureCollection | undefined;
        const kayttooikeusyksikkotunnukset = [
          ...new Set(
            (geojson?.features ?? [])
              .map((f) => f.properties?.kayttooikeusyksikkotunnus as string | undefined)
              .filter((t): t is string => !!t)
          ),
        ];
        log.info("haeTiekunnat bbox-haun tulos", { count: kayttooikeusyksikkotunnukset.length, tunnukset: kayttooikeusyksikkotunnukset });
        for (const kyselytunnukset of chunkArray(kayttooikeusyksikkotunnukset, MAX)) {
          const perustiedotUrl =
            options.ogcEndpoint +
            "/collections/KayttooikeusyksikonPerustiedot/items?kayttooikeusyksikkotunnus=" +
            kyselytunnukset.join(",") +
            "&tiekunnallisuus=1";
          log.info("haeTiekunnat perustiedot url: " + perustiedotUrl);
          let perustiedotResponse;
          try {
            perustiedotResponse = await axios.get(perustiedotUrl, {
              headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
              timeout: TIMEOUT,
            });
          } catch (e) {
            if (isUnknownCollectionError(e)) {
              log.warn("haeTiekunnat: KayttooikeusyksikonPerustiedot-kokoelma ei ole saatavilla, ohitetaan");
              continue;
            }
            throw e;
          }
          const perustiedotGeojson = perustiedotResponse.data as FeatureCollection | undefined;
          for (const feat of perustiedotGeojson?.features ?? []) {
            if (feat.properties?.tiekunta) {
              feat.properties.tiekunta.forEach((t: { nimi: string; id: number; kotikunta?: { nimiSuomeksi: string }[] }) => {
                if (!tiekuntaMap.has(t.id)) {
                  tiekuntaMap.set(t.id, {
                    id: t.id,
                    nimi: t.nimi,
                    kayttooikeusyksikkotunnus: feat.properties?.kayttooikeusyksikkotunnus,
                    tiekuntaKunta: t.kotikunta?.[0]?.nimiSuomeksi,
                  });
                }
              });
            }
          }
        }
      } catch (e) {
        if (isUnknownCollectionError(e)) {
          log.warn("haeTiekunnat: KayttooikeusyksikonOsanSijaintitiedot-kokoelma ei ole saatavilla, palautetaan tyhjä lista");
          return yhteystiedot;
        }
        throw e;
      }
      if (skipYhteystiedot) {
        for (const omistaja of tiekuntaMap.values()) {
          yhteystiedot.push({ kayttooikeusyksikkotunnus: omistaja.kayttooikeusyksikkotunnus, omistajat: [omistaja] });
        }
        return yhteystiedot;
      }
      if (options.ogcApiExamples === "true") {
        const url = options.ogcEndpoint + "/collections/TiekunnanYhteystiedot/items/94615362";
        auditLog.info("Tiekuntien yhteystietojen haku", { url });
        let tiekunnatFeat: Feature | undefined;
        try {
          const response = await axios.get(url, {
            headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
            timeout: TIMEOUT,
          });
          if (debug) {
            console.log("rawdata: %s", JSON.stringify(response.data));
          }
          tiekunnatFeat = response.data as Feature;
        } catch (e) {
          if (isUnknownCollectionError(e)) {
            log.warn("haeTiekunnat: TiekunnanYhteystiedot-kokoelma ei ole saatavilla, ohitetaan");
          } else {
            throw e;
          }
        }
        if (tiekunnatFeat) {
          const feat = tiekunnatFeat;
          // jätetään ensimmäinen tiekunta ilman yhteyshenkilöä
          const tiekunnat = [...tiekuntaMap.values()];
          tiekunnat.shift();
          for (const omistaja of tiekunnat) {
            // tiekunnan nimi sulkuihin
            omistaja.nimi = feat.properties?.yhteyshenkilo[0].nimi + (omistaja.nimi ? " (" + omistaja.nimi + ")" : "");
            omistaja.yhteystiedot = {
              jakeluosoite: feat.properties?.yhteyshenkilo[0].osoite[0]?.osoite,
              postinumero: feat.properties?.yhteyshenkilo[0].osoite[0]?.postinumero,
              paikkakunta: feat.properties?.yhteyshenkilo[0].osoite[0]?.postitoimipaikka,
              maakoodi: feat.properties?.yhteyshenkilo[0].osoite[0]?.valtio
                ? lookup.byIso(feat.properties.yhteyshenkilo[0].osoite[0].valtio)?.iso2
                : undefined,
            };
            omistaja.tiekuntaKunta = feat.properties?.tiekunnanKotikunta?.[0]?.nimiSuomeksi;
          }
        }
      } else {
        const ids = [...tiekuntaMap.keys()];
        for (const kyselyids of chunkArray(ids, MAX)) {
          const url = options.ogcEndpoint + "/collections/TiekunnanYhteystiedot/items?id=" + kyselyids.join(",");
          auditLog.info("Tiekuntien yhteystietojen haku", { ids: kyselyids, url });
          try {
            const response = await axios.get(url, {
              headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
              timeout: TIMEOUT,
            });
            if (debug) {
              console.log("rawdata: %s", JSON.stringify(response.data));
            }
            const geojson = response.data as FeatureCollection | undefined;
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
                  omistaja.tiekuntaKunta = feat.properties.tiekunnanKotikunta?.[0]?.nimiSuomeksi;
                }
              }
            }
          } catch (e) {
            if (isUnknownCollectionError(e)) {
              log.warn("haeTiekunnat: TiekunnanYhteystiedot-kokoelma ei ole saatavilla, ohitetaan");
              break;
            }
            throw e;
          }
        }
      }
      for (const yhteyshenkilo of tiekuntaMap.values()) {
        yhteystiedot.push({
          kayttooikeusyksikkotunnus: yhteyshenkilo.kayttooikeusyksikkotunnus,
          omistajat: [{ nimi: yhteyshenkilo.nimi, yhteystiedot: yhteyshenkilo.yhteystiedot, tiekuntaKunta: yhteyshenkilo.tiekuntaKunta }],
        });
      }
      return yhteystiedot;
    },
    haeMaaraalat: async (bbox, uid, debug = false, excludeKiinteistotunnukset: string[] = [], skipYhteystiedot = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const bboxParam = bbox.join(",");
      const url = options.ogcEndpoint + "/collections/MaaraalanOsanSijaintitiedot/items?bbox=" + bboxParam;
      log.info("haeMaaraalat url: " + url);
      auditLog.info("Määräalojen haku bbox:llä", { bbox });
      let response;
      try {
        response = await axios.get(url, {
          headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
          timeout: TIMEOUT,
        });
      } catch (e) {
        if (isUnknownCollectionError(e)) {
          log.warn("haeMaaraalat: MaaraalanOsanSijaintitiedot-kokoelma ei ole saatavilla, palautetaan tyhjä lista");
          return yhteystiedot;
        }
        throw e;
      }
      if (debug) {
        console.log("rawdata: %s", JSON.stringify(response.data));
      }
      const geojson = response.data as FeatureCollection | undefined;
      const maaraalatunnukset = [
        ...new Set(
          (geojson?.features ?? []).map((f) => f.properties?.maaraalatunnus as string | undefined).filter((t): t is string => !!t)
        ),
      ];
      if (!maaraalatunnukset.length) return yhteystiedot;
      for (const kyselytunnukset of chunkArray(maaraalatunnukset, MAX)) {
        const perustiedotUrl =
          options.ogcEndpoint + "/collections/MaaraalanPerustiedot/items?maaraalatunnus=" + kyselytunnukset.join(",") + "&olotila=1";
        log.info("haeMaaraalat perustiedot url: " + perustiedotUrl);
        auditLog.info("Määräalojen perustietojen haku", { maaraalatunnukset: kyselytunnukset });
        let perustiedotResponse;
        try {
          perustiedotResponse = await axios.get(perustiedotUrl, {
            headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
            timeout: TIMEOUT,
          });
        } catch (e) {
          if (isUnknownCollectionError(e)) {
            log.warn("haeMaaraalat: MaaraalanPerustiedot-kokoelma ei ole saatavilla, ohitetaan");
            continue;
          }
          throw e;
        }
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(perustiedotResponse.data));
        }
        const perustiedotGeojson = perustiedotResponse.data as FeatureCollection | undefined;
        const kiinteistotunnukset = [
          ...new Set(
            (perustiedotGeojson?.features ?? [])
              .map((f) => f.properties?.maaraalanSijaintirekisteriyksikko?.[0]?.kiinteistotunnus as string | undefined)
              .filter((t): t is string => !!t)
          ),
        ];
        if (!kiinteistotunnukset.length) continue;
        const uudetKiinteistotunnukset = kiinteistotunnukset.filter((t) => !excludeKiinteistotunnukset.includes(t));
        log.info("haeMaaraalat löydetyt kiinteistöt", { kaikki: kiinteistotunnukset, uudet: uudetKiinteistotunnukset });
        if (!uudetKiinteistotunnukset.length) continue;
        if (skipYhteystiedot) {
          uudetKiinteistotunnukset.forEach((t) => yhteystiedot.push({ kiinteistotunnus: t, omistajat: [] }));
          continue;
        }
        // Haetaan lainhuutotiedot ja yhteystiedot KTJ:stä rinnakkain
        const [lainhuutotiedot, ktjYhteystiedot] = await Promise.all([
          client.haeLainhuutotiedot(uudetKiinteistotunnukset, uid, debug),
          client.haeYhteystiedot(uudetKiinteistotunnukset, uid, debug),
        ]);
        yhteystiedot.push(...lainhuutotiedot);
        yhteystiedot.push(...ktjYhteystiedot);
      }
      return yhteystiedot;
    },
    haeRantakunnat: async (bbox, uid, debug = false, skipYhteystiedot = false) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const rantakuntaMap = new Map<number, Omistaja>();
      const bboxParam = bbox.join(",");
      const url = options.ogcEndpoint + "/collections/KayttooikeusyksikonOsanSijaintitiedot/items?bbox=" + bboxParam;
      log.info("haeRantakunnat url: " + url);
      auditLog.info("Rantakuntien haku bbox:llä", { bbox });
      try {
        const response = await axios.get(url, {
          headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
          timeout: TIMEOUT,
        });
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(response.data));
        }
        const geojson = response.data as FeatureCollection | undefined;
        const kayttooikeusyksikkotunnukset = [
          ...new Set(
            (geojson?.features ?? [])
              .map((f) => f.properties?.kayttooikeusyksikkotunnus as string | undefined)
              .filter((t): t is string => !!t)
          ),
        ];
        log.info("haeRantakunnat bbox-haun tulos", { count: kayttooikeusyksikkotunnukset.length, tunnukset: kayttooikeusyksikkotunnukset });
        for (const kyselytunnukset of chunkArray(kayttooikeusyksikkotunnukset, MAX)) {
          const perustiedotUrl =
            options.ogcEndpoint +
            "/collections/KayttooikeusyksikonPerustiedot/items?kayttooikeusyksikkotunnus=" +
            kyselytunnukset.join(",");
          log.info("haeRantakunnat perustiedot url: " + perustiedotUrl);
          let perustiedotResponse;
          try {
            perustiedotResponse = await axios.get(perustiedotUrl, {
              headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
              timeout: TIMEOUT,
            });
          } catch (e) {
            if (isUnknownCollectionError(e)) {
              log.warn("haeRantakunnat: KayttooikeusyksikonPerustiedot-kokoelma ei ole saatavilla, ohitetaan");
              continue;
            }
            throw e;
          }
          const perustiedotGeojson = perustiedotResponse.data as FeatureCollection | undefined;
          for (const feat of perustiedotGeojson?.features ?? []) {
            if (feat.properties?.rantakunta) {
              feat.properties.rantakunta.forEach((t: { nimi: string; id: number; kotikunta?: { nimiSuomeksi: string }[] }) => {
                if (!rantakuntaMap.has(t.id)) {
                  rantakuntaMap.set(t.id, {
                    id: t.id,
                    nimi: t.nimi,
                    kayttooikeusyksikkotunnus: feat.properties?.kayttooikeusyksikkotunnus,
                    tiekuntaKunta: t.kotikunta?.[0]?.nimiSuomeksi,
                  });
                }
              });
            }
          }
        }
      } catch (e) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (isUnknownCollectionError(e) || status === 400) {
          log.warn("haeRantakunnat: KayttooikeusyksikonOsanSijaintitiedot-haku epäonnistui, palautetaan tyhjä lista", { status });
          return yhteystiedot;
        }
        throw e;
      }
      if (skipYhteystiedot) {
        for (const omistaja of rantakuntaMap.values()) {
          yhteystiedot.push({ kayttooikeusyksikkotunnus: omistaja.kayttooikeusyksikkotunnus, omistajat: [omistaja] });
        }
        return yhteystiedot;
      }
      if (options.ogcApiExamples === "true") {
        const url = options.ogcEndpoint + "/collections/RantakunnanYhteystiedot/items/94615362";
        auditLog.info("Rantakuntien yhteystietojen haku", { url });
        let rantakunnatFeat: Feature | undefined;
        try {
          const response = await axios.get(url, {
            headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
            timeout: TIMEOUT,
          });
          if (debug) {
            console.log("rawdata: %s", JSON.stringify(response.data));
          }
          rantakunnatFeat = response.data as Feature;
        } catch (e) {
          if (isUnknownCollectionError(e)) {
            log.warn("haeRantakunnat: RantakunnanYhteystiedot-kokoelma ei ole saatavilla, ohitetaan");
          } else {
            throw e;
          }
        }
        if (rantakunnatFeat) {
          const feat = rantakunnatFeat;
          // jätetään ensimmäinen rantakunta ilman yhteyshenkilöä
          const rantakunnat = [...rantakuntaMap.values()];
          rantakunnat.shift();
          for (const omistaja of rantakunnat) {
            omistaja.nimi = feat.properties?.yhteyshenkilo[0].nimi + (omistaja.nimi ? " (" + omistaja.nimi + ")" : "");
            omistaja.yhteystiedot = {
              jakeluosoite: feat.properties?.yhteyshenkilo[0].osoite[0]?.osoite,
              postinumero: feat.properties?.yhteyshenkilo[0].osoite[0]?.postinumero,
              paikkakunta: feat.properties?.yhteyshenkilo[0].osoite[0]?.postitoimipaikka,
              maakoodi: feat.properties?.yhteyshenkilo[0].osoite[0]?.valtio
                ? lookup.byIso(feat.properties.yhteyshenkilo[0].osoite[0].valtio)?.iso2
                : undefined,
            };
            omistaja.tiekuntaKunta = feat.properties?.rantakunnanKotikunta?.[0]?.nimiSuomeksi;
          }
        }
      } else {
        const ids = [...rantakuntaMap.keys()];
        for (const kyselyids of chunkArray(ids, MAX)) {
          const url = options.ogcEndpoint + "/collections/RantakunnanYhteystiedot/items?id=" + kyselyids.join(",");
          auditLog.info("Rantakuntien yhteystietojen haku", { ids: kyselyids, url });
          try {
            const response = await axios.get(url, {
              headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
              timeout: TIMEOUT,
            });
            if (debug) {
              console.log("rawdata: %s", JSON.stringify(response.data));
            }
            const geojson = response.data as FeatureCollection | undefined;
            for (const feat of geojson?.features ?? []) {
              if (feat?.properties?.yhteyshenkilo[0]) {
                const omistaja = rantakuntaMap.get(feat.id as number);
                if (omistaja && !omistaja.yhteystiedot) {
                  omistaja.nimi = feat.properties.yhteyshenkilo[0].nimi + (omistaja.nimi ? " (" + omistaja.nimi + ")" : "");
                  omistaja.yhteystiedot = {
                    jakeluosoite: feat.properties.yhteyshenkilo[0].osoite[0]?.osoite,
                    postinumero: feat.properties.yhteyshenkilo[0].osoite[0]?.postinumero,
                    paikkakunta: feat.properties.yhteyshenkilo[0].osoite[0]?.postitoimipaikka,
                    maakoodi: feat.properties.yhteyshenkilo[0].osoite[0]?.valtio
                      ? lookup.byIso(feat.properties.yhteyshenkilo[0].osoite[0].valtio)?.iso2
                      : undefined,
                  };
                  omistaja.tiekuntaKunta = feat.properties.rantakunnanKotikunta?.[0]?.nimiSuomeksi;
                }
              }
            }
          } catch (e) {
            if (isUnknownCollectionError(e)) {
              log.warn("haeRantakunnat: RantakunnanYhteystiedot-kokoelma ei ole saatavilla, ohitetaan");
              break;
            }
            throw e;
          }
        }
      }
      for (const yhteyshenkilo of rantakuntaMap.values()) {
        yhteystiedot.push({
          kayttooikeusyksikkotunnus: yhteyshenkilo.kayttooikeusyksikkotunnus,
          omistajat: [{ nimi: yhteyshenkilo.nimi, yhteystiedot: yhteyshenkilo.yhteystiedot, tiekuntaKunta: yhteyshenkilo.tiekuntaKunta }],
        });
      }
      return yhteystiedot;
    },
    haeYhteisalueet: async (kiinteistotunnukset, uid, debug = false) => {
      const tulokset: MmlKiinteisto[] = [];
      const tunnuksetSet = new Set<string>();
      const chunks = chunkArray(kiinteistotunnukset, MAX);
      for (const kyselytunnukset of chunks) {
        const url =
          options.ogcEndpoint + "/collections/RekisteriyksikonYhteisalueosuudet/items?kiinteistotunnus=" + kyselytunnukset.join(",");
        log.info("haeYhteisalueet url: " + url);
        auditLog.info("Yhteisalueiden haku", { kiinteistotunnukset: kyselytunnukset });
        let yhteisalueetResponse;
        try {
          yhteisalueetResponse = await axios.get(url, {
            headers: { "x-api-key": options.ogcApiKey, enduserid: uid },
            timeout: TIMEOUT,
          });
        } catch (e) {
          if (isUnknownCollectionError(e)) {
            log.warn("haeYhteisalueet: RekisteriyksikonYhteisalueosuudet-kokoelma ei ole saatavilla, palautetaan tyhjä lista");
            return tulokset;
          }
          throw e;
        }
        if (debug) {
          console.log("rawdata: %s", JSON.stringify(yhteisalueetResponse.data));
        }
        const geojson = yhteisalueetResponse.data as FeatureCollection;
        for (const feat of geojson.features) {
          for (const alue of feat.properties?.yhteisalueosuus ?? []) {
            const tunnus = alue.yhteisalueyksikko?.kiinteistotunnus as string | undefined;
            if (tunnus && !tunnuksetSet.has(tunnus) && !kiinteistotunnukset.includes(tunnus)) {
              tunnuksetSet.add(tunnus);
              tulokset.push({ kiinteistotunnus: tunnus, omistajat: [] });
            }
          }
        }
      }
      return tulokset;
    },
  };
  return client;
}
