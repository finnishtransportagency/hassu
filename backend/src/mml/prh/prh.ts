import axios from "axios";
import lookup from "country-code-lookup";
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
  postiosoite: string | null;
  toiminimi: string;
  postinumero: string | null;
  coNimi: string | null;
  toimipaikka: string | null;
  maa: string | null;
  ulkomaanosoite: {
    maa: string | null;
    osoite: string | null;
  } | null;
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

function trim(text: string | undefined | null) {
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
            nimi: [trim(prhResponse.coNimi), trim(prhResponse.toiminimi)].filter((str) => !!str).join(", "),
            ytunnus: trim(prhResponse.yTunnus),
            yhteystiedot: determineYhteystiedot(prhResponse),
          };
          return omistaja;
        })
    );

    const allReponseOmistajas = await Promise.allSettled(promises);
    const succeededOmistajas = allReponseOmistajas
      .filter((promiseResult): promiseResult is PromiseFulfilledResult<Omistaja> => promiseResult.status === "fulfilled")
      .map((response) => response.value);
    const rejectedReasons = allReponseOmistajas
      .filter((promiseResult): promiseResult is PromiseRejectedResult => promiseResult.status === "rejected")
      .map((rejectedOmistaja) => rejectedOmistaja.reason);

    if (rejectedReasons.length) {
      auditLog.info("PRH tietojen haku epäonnistui", { uid, rejectedReasons });
    }

    omistajat.push(...succeededOmistajas);
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
    const ulkomaa = trim(prhResponse.ulkomaanosoite?.maa);
    const ulkomaanOsoite = trim(prhResponse.ulkomaanosoite?.osoite);
    const maakoodi = convertCountryNameToIso2Code(ulkomaa);

    // Jollei maatietoa saada muutettua maakoodiksi, lisätään se osoitteen perään
    const jakeluosoite = maakoodi ? ulkomaanOsoite : [ulkomaanOsoite, ulkomaa].filter((str) => !!str).join(" ");

    return { jakeluosoite, maakoodi, paikkakunta: undefined, postinumero: undefined };
  }

  // Taitaa maa-kenttä palauttaa maatiedon tekstinä esim. "FINLAND" tai "UNITED STATES" kuten ulkomaan osoitteeseen
  // Tämä on vain olettamus, koska en ole löytänyt yritystä, jolle ei tulisi tyhjä merkkijono tähän kenttään
  // Muunnetaan iso2-koodiksi, defaultataan suomeksi
  const maakoodi = convertCountryNameToIso2Code(trim(prhResponse.maa)) ?? "FI";

  return {
    jakeluosoite: trim(prhResponse.postiosoite),
    postinumero: trim(prhResponse.postinumero),
    paikkakunta: trim(prhResponse.toimipaikka),
    maakoodi,
  };
}

function convertCountryNameToIso2Code(maanimi: string | undefined) {
  return maanimi ? lookup.countries.find((country) => country.country.toLowerCase() === maanimi.toLowerCase())?.iso2 : undefined;
}
