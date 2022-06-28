import { Kieli } from "../../../common/graphql/apiModel";
import * as commonFI from "../../../src/locales/fi/common.json";
import * as commonSV from "../../../src/locales/sv/common.json";
import * as projektiFI from "../../../src/locales/fi/projekti.json";
import * as projektiSV from "../../../src/locales/sv/projekti.json";
import get from "lodash/get";

const languageBundles = {
  [Kieli.SUOMI]: [commonFI as Record<string, unknown>, projektiFI as Record<string, unknown>],
  [Kieli.RUOTSI]: [commonSV as Record<string, unknown>, projektiSV as Record<string, unknown>],
  [Kieli.SAAME]: [commonFI as Record<string, unknown>, projektiFI as Record<string, unknown>], // TODO: Lisää tuki saamelle
};

export function translate(key: string, kieli: Kieli): string | undefined {
  const bundles = languageBundles[kieli];
  if (!bundles) {
    return undefined;
  }
  for (const bundle of bundles) {
    const translation = get(bundle, key);
    if (translation) {
      return translation as string;
    }
  }
}
