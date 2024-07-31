import * as API from "./graphql/apiModel";
import { Kielitiedot } from "./graphql/apiModel";
import { SaameKieli } from "../backend/src/database/model";

export type KaannettavaKieli = API.Kieli.SUOMI | API.Kieli.RUOTSI;

export function isKieliTranslatable(kieli: API.Kieli | undefined | null): kieli is KaannettavaKieli {
  if (!kieli) {
    return false;
  }
  return [API.Kieli.SUOMI, API.Kieli.RUOTSI].includes(kieli);
}

export function isKieliSaame(kieli: API.Kieli | undefined | null): boolean {
  if (!kieli) {
    return false;
  }
  return Object.keys(SaameKieli).includes(kieli);
}

export function getKaannettavatKielet(kielitiedot: Partial<API.Kielitiedot | Kielitiedot | API.KielitiedotInput> | undefined | null): {
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
} {
  if (!kielitiedot) {
    return { ensisijainenKaannettavaKieli: null, toissijainenKaannettavaKieli: null };
  }
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot;
  const ensisijainenKaannettavaKieli = isKieliTranslatable(ensisijainenKieli) ? (ensisijainenKieli as KaannettavaKieli) : null;
  const toissijainenKaannettavaKieli = isKieliTranslatable(toissijainenKieli) ? (toissijainenKieli as KaannettavaKieli) : null;
  return { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli };
}

export function normalizeKieli(kieli: API.Kieli | string): KaannettavaKieli {
  switch (kieli) {
    case API.Kieli.RUOTSI:
    case "sv":
      return API.Kieli.RUOTSI;
    default:
      return API.Kieli.SUOMI;
  }
}
