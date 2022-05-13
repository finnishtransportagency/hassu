import { Kieli } from "../../../common/graphql/apiModel";
import * as commonFI from "../../../src/locales/fi/common.json";
import * as commonSV from "../../../src/locales/sv/common.json";

export function translate(key: string, kieli: Kieli): string {
  let bundle;
  if (kieli == Kieli.SUOMI) {
    bundle = commonFI;
  } else if (kieli == Kieli.RUOTSI) {
    bundle = commonSV;
  } else {
    return;
  }
  return key.split(".").reduce((previousValue, currentValue) => {
    return previousValue[currentValue];
  }, bundle);
}
