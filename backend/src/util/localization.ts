import { Kieli } from "hassu-common/graphql/apiModel";
import * as commonFI from "../../../src/locales/fi/common.json";
import * as commonSV from "../../../src/locales/sv/common.json";
import * as projektiFI from "../../../src/locales/fi/projekti.json";
import * as projektiSV from "../../../src/locales/sv/projekti.json";
import * as aineistoFI from "../../../src/locales/fi/aineisto.json";
import * as aineistoSV from "../../../src/locales/sv/aineisto.json";
import get from "lodash/get";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

const languageBundles = {
  [Kieli.SUOMI]: [commonFI as Record<string, unknown>, projektiFI as Record<string, unknown>, aineistoFI as Record<string, unknown>],
  [Kieli.RUOTSI]: [commonSV as Record<string, unknown>, projektiSV as Record<string, unknown>, aineistoSV as Record<string, unknown>],
};

export function translate(key: string, kieli: KaannettavaKieli): string | undefined {
  const bundles = languageBundles[kieli];
  for (const bundle of bundles) {
    const translation = get(bundle, key);
    if (translation) {
      return translation as string;
    }
  }
}
