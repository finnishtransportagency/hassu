import * as API from "hassu-common/graphql/apiModel";
import { JulkaisuKey as DBJulkaisuKey } from "../database/model/julkaisuKey";
import { DBProjekti, ProjektinJakautuminen } from "../database/model";
import { haeLiittyvanProjektinTiedot } from "./haeLiittyvanProjektinTiedot";
import { log } from "../logger";

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

const keraaApiJulkaisutJaDBJulkaisut = (adaptedProjekti: API.ProjektiJulkinen, projektiFromDB: DBProjekti) =>
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

export async function lisaaJakotiedotJulkisilleJulkaisuille(adaptedProjekti: API.ProjektiJulkinen, projektiFromDB: DBProjekti) {
  const dbJaApijulkaisutJaAvaimet = keraaApiJulkaisutJaDBJulkaisut(adaptedProjekti, projektiFromDB);

  if (!dbJaApijulkaisutJaAvaimet.length) {
    return;
  }

  const viimeisinJulkaisu = dbJaApijulkaisutJaAvaimet[0].dbJulkaisu;
  const jakautuminen = viimeisinJulkaisu.projektinJakautuminen;

  log.info("lisaaJakotiedotJulkisilleJulkaisuille");
  const kopioituProjektista = jakautuminen?.jaettuProjektista
    ? await haeLiittyvanProjektinTiedot(jakautuminen.jaettuProjektista)
    : undefined;
  const kopioituProjekteihin = jakautuminen?.jaettuProjekteihin
    ? (await Promise.all(jakautuminen.jaettuProjekteihin.map((oid) => haeLiittyvanProjektinTiedot(oid)))).filter(
        (jakotieto): jakotieto is API.ProjektinJakotieto => !!jakotieto
      )
    : undefined;

  dbJaApijulkaisutJaAvaimet.forEach((avainJaJulkaisut) => {
    avainJaJulkaisut.apiJulkaisu.suunnitelmaJaettu = adaptSuunnitelmaJaettuJulkinen(
      avainJaJulkaisut.dbJulkaisu,
      kopioituProjektista,
      kopioituProjekteihin
    );
  });
}

function adaptSuunnitelmaJaettuJulkinen(
  dbJulkaisu: GenericDBJulkaisu,
  kopioituProjektista: API.ProjektinJakotieto | undefined,
  kopioituProjekteihin: API.ProjektinJakotieto[] | undefined
): API.SuunnitelmaJaettuJulkinen | undefined | null {
  if (!kopioituProjektista && !kopioituProjekteihin?.length) {
    return undefined;
  }
  const liittyvatSuunnitelmat = [
    ...(dbJulkaisu.projektinJakautuminen?.jaettuProjekteihin ?? []),
    dbJulkaisu.projektinJakautuminen?.jaettuProjektista,
  ]
    .filter((oid): oid is string => !!oid)
    .reduce<API.ProjektinJakotieto[]>((liittyvat, oid) => {
      const jakotieto =
        oid === kopioituProjektista?.oid ? kopioituProjektista : kopioituProjekteihin?.find((jakotiedot) => jakotiedot?.oid === oid);
      if (jakotieto) {
        liittyvat.push(jakotieto);
      }
      return liittyvat;
    }, []);

  const julkaisuKopioituSuunnitelmasta = dbJulkaisu.kopioituProjektista ? kopioituProjektista : undefined;

  const julkaisuKopioituSuunnitelmiin = kopioituProjekteihin?.filter(
    (jakotieto) => !dbJulkaisu.projektinJakautuminen?.jaettuProjekteihin?.includes(jakotieto.oid)
  );

  const suunnitelmaJaettuJulkinen: API.SuunnitelmaJaettuJulkinen = {
    __typename: "SuunnitelmaJaettuJulkinen",
    // Kaikki julkaisun liittyvät suunnitelmat
    liittyvatSuunnitelma: liittyvatSuunnitelmat?.[0],
    // Kaikki projektin liittyvät suunnitelmat, joille kopioitu tiedot ja jotka ei ole julkaisulla
    julkaisuKopioituSuunnitelmaan: julkaisuKopioituSuunnitelmiin?.[0],
    // Projektin liittyvä suunnitelma, josta kopioitu tiedot ja joka ei ole julkaisulla
    julkaisuKopioituSuunnitelmasta,
  };
  return suunnitelmaJaettuJulkinen;
}
