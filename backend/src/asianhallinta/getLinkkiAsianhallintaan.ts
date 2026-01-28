import { isVaylaAsianhallinta } from "hassu-common/isVaylaAsianhallinta";
import { parameters } from "../aws/parameters";
import { DBProjekti } from "../database/model";

type LinkkiAsianhallintaanFunc = (projekti: Pick<DBProjekti, "asianhallinta" | "velho">) => Promise<string | undefined>;

export const getLinkkiAsianhallintaan: LinkkiAsianhallintaanFunc = async (projekti) => {
  const asiaId = projekti.asianhallinta?.asiaId;
  if (!asiaId) {
    return undefined;
  }
  const baseUrl = isVaylaAsianhallinta(projekti) ? await parameters.getAshaBaseUrl() : await parameters.getUspaBaseUrl();
  if (!baseUrl) {
    return undefined;
  }

  return constructLinkkiAsianhallintaan(isVaylaAsianhallinta(projekti), baseUrl, asiaId);
};

export function constructLinkkiAsianhallintaan(vaylaAsianhallinta: boolean, baseUrl: string, asiaId: number): string | undefined {
  return vaylaAsianhallinta
    ? `${baseUrl}/group/asianhallinta2/asianhallinta#/${asiaId}/-/actions`
    : `${baseUrl}/Asia.aspx?AsiaId=${asiaId}`;
}
