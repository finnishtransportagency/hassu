import axios from "axios";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { parseStringPromise as parseString } from "xml2js";
import { auditLog, log } from "../logger";

type Yhteystieto = {
  jakeluosoite?: string | null;
  postinumero?: string | null;
  paikkakunta?: string | null;
  maakoodi?: string | null;
};

type Omistaja = {
  etunimet?: string;
  sukunimi?: string;
  nimi?: string;
  henkilotunnus?: string;
  ytunnus?: string;
  yhteystiedot?: Yhteystieto;
};

export type MmlKiinteisto = {
  kiinteistotunnus: string;
  omistajat: Omistaja[];
};

export type MmlClient = {
  haeLainhuutotiedot: (kiinteistotunnukset: string[]) => Promise<MmlKiinteisto[]>;
};

export type MmlOptions = {
  endpoint: string;
  apiKey: string;
};

const TIMEOUT = 20000;
const MAX = 100;

export function getMmlClient(options: MmlOptions): MmlClient {
  return {
    haeLainhuutotiedot: async (kiinteistotunnukset: string[]) => {
      const yhteystiedot: MmlKiinteisto[] = [];
      const tunneksetVastaus = [...kiinteistotunnukset];
      const tunnukset = [...kiinteistotunnukset];
      do {
        const kyselytunnukset = tunnukset.splice(0, MAX);
        const url = options.endpoint + "/lainhuutotiedot/xml?kiinteistotunnus=" + kyselytunnukset.join(",");
        log.info("haeYhteystiedot url: " + url);
        auditLog.info("Lainhuutotietojen haku", { kiinteistotunnukset: kyselytunnukset });
        const response = await axios.get(url, { headers: { "x-api-key": options.apiKey }, timeout: TIMEOUT });
        //console.log("rawdata: %s", response.data.replaceAll("\n", ""));
        const responseJson = await parseString(response.data);
        if (responseJson["kylh:Lainhuutotiedot"]["kylh:Rekisteriyksikko"]) {
          for (const yksikko of responseJson["kylh:Lainhuutotiedot"]["kylh:Rekisteriyksikko"]) {
            const omistajat: Omistaja[] = [];
            const kiinteistotunnus = yksikko["trpt:rekisteriyksikonPerustiedot"][0]["y:kiinteistotunnus"][0];
            for (const asia of yksikko["trlh:lainhuudot"][0]["trlh:Lainhuutoasia"]) {
              // Ratkaistu tai Loppuunsaatettu
              if (asia["y:asianTila"][0] === "02" || asia["y:asianTila"][0] === "03") {
                for (const kohde of asia["trlh:osuudetAsianKohteesta"][0]["trlh:OsuusAsianKohteesta"]) {
                  for (const hlo of kohde["y:osuudenHenkilot"][0]["y:Henkilo"]) {
                    const tiedot = hlo["y:henkilonTiedot"][0];
                    const osoite = hlo["muti:Osoite"] ? hlo["muti:Osoite"][0] : undefined;
                    omistajat.push({
                      henkilotunnus: tiedot["y:henkilotunnus"] ? tiedot["y:henkilotunnus"][0] : undefined,
                      etunimet: tiedot["y:etunimet"] ? tiedot["y:etunimet"][0] : undefined,
                      sukunimi: tiedot["y:sukunimi"] ? tiedot["y:sukunimi"][0] : undefined,
                      ytunnus: tiedot["y:ytunnus"] ? tiedot["y:ytunnus"][0] : undefined,
                      nimi: tiedot["y:nimi"] ? tiedot["y:nimi"][0] : undefined,
                      yhteystiedot: {
                        jakeluosoite: osoite ? osoite["muti:jakeluosoite"][0] : undefined,
                        paikkakunta: osoite ? osoite["muti:paikkakunta"][0] : undefined,
                        postinumero: osoite ? osoite["muti:postinumero"][0] : undefined,
                        maakoodi: osoite ? osoite["muti:maakoodi"][0] : undefined,
                      },
                    });
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
  };
}
