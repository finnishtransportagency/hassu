import axios from "axios";
import { auditLog } from "../../logger";
import { Omistaja } from "../mmlClient";
import { chunkArray } from "../../database/chunkArray";

export type PrhConfig = {
  endpoint: string;
  username: string;
  password: string;
};

export type Options = {
  endpoint: string;
  username: string;
  password: string;
};

type PrhResponse = {
  yTunnus: string;
  postiosoite: string;
  toiminimi: string;
  postinumero: string;
  coNimi: string;
  toimipaikka: string;
  maa: string;
  ulkomaanosoite: string;
};

const TIMEOUT = 120000;

export type PrhClient = {
  haeYritykset: (ytunnus: string[], uid: string) => Promise<Omistaja[]>;
};

export async function createPrhClient(options: Options): Promise<PrhClient> {
  return {
    haeYritykset: (ytunnus, uid) => {
      return haeYritykset(ytunnus, uid, options);
    },
  };
}

function trim(text: string | undefined) {
  const txt = text?.trim();
  return txt || undefined;
}

async function haeYritykset(ytunnus: string[], uid: string, options: Options): Promise<Omistaja[]> {
  auditLog.info("PRH tietojen haku", { ytunnukset: ytunnus, uid });
  const omistajat: Omistaja[] = [];
  for (const ytunnusChunk of chunkArray(ytunnus, 10)) {
    const promises = ytunnusChunk.map((tunnus) =>
      axios
        .get(options.endpoint + "?YTunnus=" + tunnus, {
          auth: { username: options.username, password: options.password },
          timeout: TIMEOUT,
          validateStatus: (status) => status === 200 || status === 404,
        })
        .then((response) => {
          const prhResponse: PrhResponse = response.data;
          const omistaja: Omistaja = {
            nimi: trim(prhResponse.coNimi) ?? trim(prhResponse.toiminimi),
            ytunnus: trim(prhResponse.yTunnus),
            yhteystiedot: determineYhteystiedot(prhResponse),
          };
          return omistaja;
        })
    );
    omistajat.push(...(await Promise.all(promises)));
  }
  return omistajat;
}

/**
 * @param prhResponse
 * @returns Omistajan yrityksen ulkomaisen postiosoitteen, jollei kotimaista löydy. Muutoin kotimaisen, vaikkakin sen tiedot olisivat puutteelliset
 */
function determineYhteystiedot(prhResponse: PrhResponse): Omistaja["yhteystiedot"] {
  const hasOnlyForeignPostalAddress =
    !!prhResponse.ulkomaanosoite && !prhResponse.postiosoite && !prhResponse.postinumero && !prhResponse.toimipaikka && !prhResponse.maa;
  if (hasOnlyForeignPostalAddress) {
    return { jakeluosoite: prhResponse.ulkomaanosoite, maakoodi: undefined, paikkakunta: undefined, postinumero: undefined };
  }

  return {
    jakeluosoite: trim(prhResponse.postiosoite),
    postinumero: trim(prhResponse.postinumero),
    paikkakunta: trim(prhResponse.toimipaikka),
    maakoodi: trim(prhResponse.maa) ?? "FI",
  };
}
