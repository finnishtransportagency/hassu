import axios from "axios";
import { auditLog } from "../../logger";
import { Omistaja } from "../mmlClient";
import { uuid } from "hassu-common/util/uuid";
import { nyt } from "../../util/dateUtil";
import { chunkArray } from "../../database/chunkArray";

export type PrhConfig = {
  endpoint: string;
  username: string;
  password: string;
  palvelutunnus: string;
  kohdetunnus: string;
};

export type Options = {
  endpoint: string;
  username: string;
  password: string;
  palveluTunnus: string;
  kohdeTunnus: string;
};

type PrhResponse = {
  schemaLocation: string;
  Organisaatio?: {
    Id: string;
    YTunnus: string;
    Nimi: string;
    Kotipaikka: string;
    Puhelin: string;
    Fax: string;
    Sahkoposti: string;
    Kotisivu: string;
    Rekisterointipvm: string;
    Kaupparekisterinumero: string;
    Lakkaamispvm: string;
    Sijainti: string;
    Tila: string;
    Osoite?: {
      Katuosoite: string;
      Postinumero: string;
      Postitoimipaikka: string;
      Maa: string;
    };
    aikaleima: string;
    muuttaja: string;
    TilanStatus: string;
    Ryhma: string;
  };
};

const TIMEOUT = 120000;

export type PrhClient = {
  haeYritykset: (ytunnus: string[], uid: string) => Promise<Omistaja[]>;
};

export async function getPrhClient(options: Options): Promise<PrhClient> {
  return {
    haeYritykset: (ytunnus, uid) => {
      return haeYritykset(ytunnus, uid, options);
    },
  };
}

async function haeYritykset(ytunnus: string[], uid: string, options: Options): Promise<Omistaja[]> {
  auditLog.info("PRH tietojen haku", { ytunnukset: ytunnus });
  const omistajat: Omistaja[] = [];
  for (const ytunnusChunk of chunkArray(ytunnus, 10)) {
    const promises = ytunnusChunk.map((tunnus) =>
      axios
        .get(options.endpoint + "?YTunnus=" + tunnus, {
          headers: {
            "SOA-KayttajanID": uid,
            "SOA-Toiminto": "GET",
            "SOA-Kutsuja": options.palveluTunnus,
            "SOA-Kohde": options.kohdeTunnus,
            "SOA-ViestinID": uuid.v4(),
            "SOA-Aikaleima": nyt().toISOString(),
          },
          auth: { username: options.username, password: options.password },
          timeout: TIMEOUT,
          validateStatus: (status) => status === 200 || status === 404,
        })
        .then((response) => {
          const prhResponse: PrhResponse = response.data;
          const omistaja: Omistaja = {
            nimi: prhResponse.Organisaatio?.Nimi,
            ytunnus: prhResponse.Organisaatio?.YTunnus ?? tunnus,
            yhteystiedot: {
              jakeluosoite: prhResponse.Organisaatio?.Osoite?.Katuosoite,
              postinumero: prhResponse.Organisaatio?.Osoite?.Postinumero,
              paikkakunta: prhResponse.Organisaatio?.Osoite?.Postitoimipaikka,
              maakoodi: prhResponse.Organisaatio?.Osoite?.Maa,
            },
          };
          return omistaja;
        })
    );
    omistajat.push(...(await Promise.all(promises)));
  }
  return omistajat;
}
