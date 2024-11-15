import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../database/model";
import { haeLiittyvienProjektienTiedot } from "../../haeLiittyvienProjektienTiedot";

export async function adaptSuunnitelmaJaettu({
  jaettuProjekteihin,
  jaettuProjektista,
}: DBProjekti): Promise<API.Projekti["suunnitelmaJaettu"]> {
  if (!jaettuProjekteihin?.length && !jaettuProjektista) {
    return undefined;
  }
  const suunnitelmaJaettuOidt = [...(jaettuProjekteihin ?? []), jaettuProjektista].filter((oid): oid is string => !!oid);

  const liittyvatProjektit = await haeLiittyvienProjektienTiedot(suunnitelmaJaettuOidt);

  return liittyvatProjektit?.map<API.ProjektinJakotieto>(({ oid, nimiSuomi, nimiRuotsi, julkinen }) => ({
    __typename: "ProjektinJakotieto",
    oid,
    nimi: {
      __typename: "LokalisoituTeksti",
      SUOMI: nimiSuomi,
      RUOTSI: nimiRuotsi,
    },
    julkinen,
  }));
}
