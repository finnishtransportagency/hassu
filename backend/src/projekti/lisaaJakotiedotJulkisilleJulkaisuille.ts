import * as API from "hassu-common/graphql/apiModel";
import { JulkaisuKey as DBJulkaisuKey } from "../database/model/julkaisuKey";
import { DBProjekti, ProjektinJakautuminen } from "../database/model";
import { haeLiittyvanProjektinTiedot } from "./haeLiittyvanProjektinTiedot";

const aloituskuulutusKey: keyof API.ProjektiJulkinen = "aloitusKuulutusJulkaisu";
const vuorovaikutusKey: keyof API.ProjektiJulkinen = "vuorovaikutukset";
const nahtavillaoloKey: keyof API.ProjektiJulkinen = "nahtavillaoloVaihe";
const hyvaksymisKey: keyof API.ProjektiJulkinen = "hyvaksymisPaatosVaihe";
const jatkopaatos1Key: keyof API.ProjektiJulkinen = "jatkoPaatos1Vaihe";
const jatkopaatos2Key: keyof API.ProjektiJulkinen = "jatkoPaatos2Vaihe";

const JULKAISU_KEYS_REVERSED = [
  jatkopaatos2Key,
  jatkopaatos1Key,
  hyvaksymisKey,
  nahtavillaoloKey,
  vuorovaikutusKey,
  aloituskuulutusKey,
] as const;

type JulkaisuKey = (typeof JULKAISU_KEYS_REVERSED)[number];

const julkaisuApiKeyToDBKey: Record<JulkaisuKey, DBJulkaisuKey> = {
  aloitusKuulutusJulkaisu: "aloitusKuulutusJulkaisut",
  vuorovaikutukset: "vuorovaikutusKierrosJulkaisut",
  nahtavillaoloVaihe: "nahtavillaoloVaiheJulkaisut",
  hyvaksymisPaatosVaihe: "hyvaksymisPaatosVaiheJulkaisut",
  jatkoPaatos1Vaihe: "jatkoPaatos1VaiheJulkaisut",
  jatkoPaatos2Vaihe: "jatkoPaatos2VaiheJulkaisut",
};

type GenericDBJulkaisu = {
  projektinJakautuminen?: ProjektinJakautuminen | undefined;
  id: number;
  kopioituProjektista?: string | null;
};

type ApiJulkaisu =
  | API.AloitusKuulutusJulkaisuJulkinen
  | API.VuorovaikutusJulkinen
  | API.NahtavillaoloVaiheJulkaisuJulkinen
  | API.HyvaksymisPaatosVaiheJulkaisuJulkinen;

const keraaApiJulkaisutJaDBJulkaisut = (
  adaptedProjekti: API.ProjektiJulkinen,
  projektiFromDB: DBProjekti
): {
  key: JulkaisuKey;
  apiJulkaisu: ApiJulkaisu;
  dbJulkaisu: GenericDBJulkaisu;
}[] =>
  JULKAISU_KEYS_REVERSED.map<{ apiJulkaisu: ApiJulkaisu | undefined; key: JulkaisuKey }>((key) => ({
    apiJulkaisu: adaptedProjekti[key] ?? undefined,
    key,
  }))
    .filter((julkaisu): julkaisu is { key: JulkaisuKey; apiJulkaisu: ApiJulkaisu } => !!julkaisu.apiJulkaisu)
    .map<{ key: JulkaisuKey; apiJulkaisu: ApiJulkaisu; dbJulkaisu: GenericDBJulkaisu | undefined }>(({ key, apiJulkaisu }) => {
      const dbJulkaisut: GenericDBJulkaisu[] | undefined | null = projektiFromDB[julkaisuApiKeyToDBKey[key]];
      return {
        key,
        apiJulkaisu,
        dbJulkaisu: dbJulkaisut?.find((dbJulkaisu) => dbJulkaisu.id === apiJulkaisu.id),
      };
    })
    .filter(
      (avainJaJulkaisut): avainJaJulkaisut is { key: JulkaisuKey; apiJulkaisu: ApiJulkaisu; dbJulkaisu: GenericDBJulkaisu } =>
        !!avainJaJulkaisut.dbJulkaisu
    );

export async function lisaaJakotiedotProjektilleJaSenJulkisilleJulkaisuille(
  adaptedProjekti: API.ProjektiJulkinen,
  projektiFromDB: DBProjekti
): Promise<void> {
  const jakautuminen = projektiFromDB.projektinJakautuminen;

  // Projektia ei ole jaettu, keskeytetään
  if (!jakautuminen) {
    return;
  }

  const dbJaApijulkaisutJaAvaimet = keraaApiJulkaisutJaDBJulkaisut(adaptedProjekti, projektiFromDB);

  // Projektilla ei ole julkisia julkaisuja, keskeytetään
  if (!dbJaApijulkaisutJaAvaimet.length) {
    return;
  }

  const julkaisuKopioituSuunnitelmasta = jakautuminen?.jaettuProjektista
    ? await haeLiittyvanProjektinTiedot(jakautuminen.jaettuProjektista)
    : undefined;

  // Kannassa tyyppinä array, jotta myöhemmin olisi helpommin toteutettavissa useampaan kertaan projektin jakaminen
  // Toteutuksessa useampaan kertaan jakamninen on estetty
  const julkaisuKopioituSuunnitelmaan = jakautuminen.jaettuProjekteihin?.[0]
    ? await haeLiittyvanProjektinTiedot(jakautuminen.jaettuProjekteihin[0])
    : undefined;

  const viimeisinJulkaisu = dbJaApijulkaisutJaAvaimet[0].dbJulkaisu;

  // Jos viimeisimmällä julkaisulla on jakautumistiedot tai liittyvä projekti on julkinen, lisätään tiedot projektille ja julkaisuille
  if (
    viimeisinJulkaisu.projektinJakautuminen ||
    julkaisuKopioituSuunnitelmasta?.julkinen === true ||
    julkaisuKopioituSuunnitelmaan?.julkinen === true
  ) {
    adaptedProjekti.suunnitelmaJaettu = {
      __typename: "SuunnitelmaJaettuJulkinen",
      julkaisuKopioituSuunnitelmasta,
      julkaisuKopioituSuunnitelmaan,
    };

    dbJaApijulkaisutJaAvaimet.forEach((avainJaJulkaisut) => {
      avainJaJulkaisut.apiJulkaisu.suunnitelmaJaettu = adaptSuunnitelmaJaettuJulkinen(
        avainJaJulkaisut.dbJulkaisu,
        julkaisuKopioituSuunnitelmasta,
        julkaisuKopioituSuunnitelmaan
      );
    });
  }
}

function adaptSuunnitelmaJaettuJulkinen(
  dbJulkaisu: GenericDBJulkaisu,
  kopioituProjektista: API.ProjektinJakotieto | undefined,
  kopioituProjektiin: API.ProjektinJakotieto | undefined
): API.SuunnitelmaJaettuJulkinen | undefined | null {
  if (!kopioituProjektista && !kopioituProjektiin) {
    return undefined;
  }

  const julkaisuKopioituSuunnitelmasta = dbJulkaisu.projektinJakautuminen?.jaettuProjektista ? kopioituProjektista : undefined;

  const julkaisuKopioituSuunnitelmaan = dbJulkaisu.projektinJakautuminen?.jaettuProjekteihin?.[0] ? kopioituProjektiin : undefined;

  const suunnitelmaJaettuJulkinen: API.SuunnitelmaJaettuJulkinen = {
    __typename: "SuunnitelmaJaettuJulkinen",
    julkaisuKopioituSuunnitelmaan,
    julkaisuKopioituSuunnitelmasta,
  };
  return suunnitelmaJaettuJulkinen;
}
