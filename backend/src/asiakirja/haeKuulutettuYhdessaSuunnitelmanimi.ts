// Contains code generated or recommended by Amazon Q
import { Kieli } from "hassu-common/graphql/apiModel";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { ProjektinJakautuminen } from "../database/model";
import { haeJaetunProjektinOid } from "../projekti/haeJaetunProjektinOid";
import { projektiDatabase } from "../database/projektiDatabase";

export async function haeKuulutettuYhdessaSuunnitelmanimi(
  projektinJakautuminen: ProjektinJakautuminen | undefined,
  kieli: KaannettavaKieli
): Promise<string | undefined> {
  const jaetunProjektinOid = haeJaetunProjektinOid(projektinJakautuminen);
  if (!jaetunProjektinOid) {
    return undefined;
  }
  const projekti = await projektiDatabase.loadProjektiByOid(jaetunProjektinOid, true, false);
  if (!projekti?.velho?.nimi) {
    return undefined;
  }
  if (
    kieli === Kieli.RUOTSI &&
    projekti.kielitiedot?.projektinNimiVieraskielella &&
    [projekti.kielitiedot.ensisijainenKieli, projekti.kielitiedot.toissijainenKieli].includes(Kieli.RUOTSI)
  ) {
    return projekti.kielitiedot.projektinNimiVieraskielella;
  }
  return projekti.velho.nimi;
}
