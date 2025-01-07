import { LocalizedMap, ProjektinJakautuminen } from "../../../../database/model";
import { haeJaetunProjektinOid } from "../../../haeJaetunProjektinOid";
import { haeLiittyvanProjektinTiedot } from "../../../haeLiittyvanProjektinTiedot";

export async function haeKuulutettuYhdessaSuunnitelmanimi(
  projektinJakautuminen: ProjektinJakautuminen | undefined
): Promise<LocalizedMap<string> | undefined> {
  const jaetunProjektinOid = haeJaetunProjektinOid(projektinJakautuminen);
  if (!jaetunProjektinOid) {
    return undefined;
  }
  const liittyvanProjektinTiedot = (await haeLiittyvanProjektinTiedot(jaetunProjektinOid))?.nimi;
  if (!liittyvanProjektinTiedot) {
    return undefined;
  }
  return liittyvanProjektinTiedot.RUOTSI
    ? { SUOMI: liittyvanProjektinTiedot.SUOMI, RUOTSI: liittyvanProjektinTiedot.RUOTSI }
    : { SUOMI: liittyvanProjektinTiedot.SUOMI };
}
