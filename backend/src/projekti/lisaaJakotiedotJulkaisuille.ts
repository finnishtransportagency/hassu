import * as API from "hassu-common/graphql/apiModel";
import { JulkaisuKey as DBJulkaisuKey } from "../database/model/julkaisuKey";
import { DBProjekti, ProjektinJakautuminen } from "../database/model";

const aloituskuulutusKey: keyof API.Projekti = "aloitusKuulutusJulkaisu";
const nahtavillaoloKey: keyof API.Projekti = "nahtavillaoloVaiheJulkaisu";
const hyvaksymisKey: keyof API.Projekti = "hyvaksymisPaatosVaiheJulkaisu";
const jatkopaatos1Key: keyof API.Projekti = "jatkoPaatos1VaiheJulkaisu";
const jatkopaatos2Key: keyof API.Projekti = "jatkoPaatos2VaiheJulkaisu";

const JULKAISU_KEYS_REVERSED = [jatkopaatos2Key, jatkopaatos1Key, hyvaksymisKey, nahtavillaoloKey, aloituskuulutusKey] as const;

type JulkaisuKey = (typeof JULKAISU_KEYS_REVERSED)[number];

const julkaisuApiKeyToDBKey: Record<JulkaisuKey, DBJulkaisuKey> = {
  aloitusKuulutusJulkaisu: "aloitusKuulutusJulkaisut",
  nahtavillaoloVaiheJulkaisu: "nahtavillaoloVaiheJulkaisut",
  hyvaksymisPaatosVaiheJulkaisu: "hyvaksymisPaatosVaiheJulkaisut",
  jatkoPaatos1VaiheJulkaisu: "jatkoPaatos1VaiheJulkaisut",
  jatkoPaatos2VaiheJulkaisu: "jatkoPaatos2VaiheJulkaisut",
};

type GenericDBJulkaisu = {
  projektinJakautuminen?: ProjektinJakautuminen | undefined;
  id: number;
  kopioituProjektista?: string | null;
};

type ApiJulkaisu =
  | API.AloitusKuulutusJulkaisu
  | API.VuorovaikutusKierrosJulkaisu
  | API.NahtavillaoloVaiheJulkaisu
  | API.HyvaksymisPaatosVaiheJulkaisu;

const keraaApiJulkaisutJaDBJulkaisut = (adaptedProjekti: API.Projekti, projektiFromDB: DBProjekti) =>
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

export function lisaaJakotiedotJulkaisuille(
  adaptedProjekti: API.Projekti,
  projektiFromDB: DBProjekti,
  suunnitelmaJaettu: API.ProjektinJakotieto
) {
  const dbJaApijulkaisutJaAvaimet = keraaApiJulkaisutJaDBJulkaisut(adaptedProjekti, projektiFromDB);

  if (!dbJaApijulkaisutJaAvaimet.length) {
    return;
  }

  dbJaApijulkaisutJaAvaimet.forEach((avainJaJulkaisut) => {
    const julkaisunJakautumistieto: string | undefined = [
      ...(avainJaJulkaisut.dbJulkaisu.projektinJakautuminen?.jaettuProjekteihin ?? []),
      avainJaJulkaisut.dbJulkaisu.projektinJakautuminen?.jaettuProjektista,
    ].find((oid) => !!oid);
    if (julkaisunJakautumistieto === suunnitelmaJaettu.oid) {
      avainJaJulkaisut.apiJulkaisu.suunnitelmaJaettu = suunnitelmaJaettu;
    }
  });

  adaptedProjekti.vuorovaikutusKierrosJulkaisut?.forEach((apiJulkaisu) => {
    const dbJulkaisu = projektiFromDB.vuorovaikutusKierrosJulkaisut?.find(({ id }) => id === apiJulkaisu.id);
    if (!dbJulkaisu) {
      return;
    }
    const julkaisunJakautumistieto: string | undefined = [
      ...(dbJulkaisu.projektinJakautuminen?.jaettuProjekteihin ?? []),
      dbJulkaisu.projektinJakautuminen?.jaettuProjektista,
    ].find((oid) => !!oid);

    if (julkaisunJakautumistieto === suunnitelmaJaettu.oid) {
      apiJulkaisu.suunnitelmaJaettu = suunnitelmaJaettu;
    }
  });
}
