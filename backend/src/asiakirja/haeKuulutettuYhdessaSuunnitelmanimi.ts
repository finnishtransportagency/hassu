import { Kieli } from "hassu-common/graphql/apiModel";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { ProjektinJakautuminen } from "../database/model";
import { haeJaetunProjektinOid } from "../projekti/haeJaetunProjektinOid";
import { haeLiittyvanProjektinTiedot } from "../projekti/haeLiittyvanProjektinTiedot";

export async function haeKuulutettuYhdessaSuunnitelmanimi(
  projektinJakautuminen: ProjektinJakautuminen | undefined,
  kieli: KaannettavaKieli
): Promise<string | undefined> {
  const jaetunProjektinOid = haeJaetunProjektinOid(projektinJakautuminen);
  if (!jaetunProjektinOid) {
    return undefined;
  }
  const liittyvanProjektinTiedot = (await haeLiittyvanProjektinTiedot(jaetunProjektinOid))?.nimi;
  if (!liittyvanProjektinTiedot) {
    return undefined;
  }
  return kieli === Kieli.RUOTSI && liittyvanProjektinTiedot.RUOTSI ? liittyvanProjektinTiedot.RUOTSI : liittyvanProjektinTiedot.SUOMI;
}
