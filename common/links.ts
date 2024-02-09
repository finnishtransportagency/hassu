import { Kieli } from "./graphql/apiModel";
import { DBProjekti } from "../backend/src/database/model";

export type LinkableProjekti = Pick<DBProjekti, "oid" | "lyhytOsoite">;

export const FILE_PATH_DELETED_PREFIX = "/deleted";

export function linkSuunnitelma(projekti: LinkableProjekti, kieli: Kieli): string {
  let langPrefix = "";
  if (kieli == Kieli.RUOTSI) {
    langPrefix = "/sv";
  }
  let path;
  if (projekti.lyhytOsoite) {
    path = "/s/" + projekti.lyhytOsoite;
  } else {
    path = "/suunnitelma/" + projekti.oid;
  }
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + langPrefix + path;
}

export type JulkinenLinkFunction = (projekti: LinkableProjekti, kieli: Kieli) => string;

export const linkAloituskuulutus: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/aloituskuulutus";
};

export const linkSuunnitteluVaihe: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/suunnittelu";
};

export const linkNahtavillaOlo: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/nahtavillaolo";
};

export const linkHyvaksymismenettelyssa: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/hyvaksymismenettelyssa";
};

export const linkHyvaksymisPaatos: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/hyvaksymispaatos";
};

export const linkJatkoPaatos1: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/jatkopaatos1";
};

export const linkJatkoPaatos2: JulkinenLinkFunction = (projekti, kieli) => {
  return linkSuunnitelma(projekti, kieli) + "/jatkopaatos2";
};

export function linkSuunnitelmaYllapito(oid: string): string {
  return "https://" + process.env.FRONTEND_API_DOMAIN_NAME + "/yllapito/projekti/" + oid;
}

export function linkAloituskuulutusYllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/aloituskuulutus";
}

export function linkSuunnitteluVaiheYllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/suunnittelu";
}

export function linkNahtavillaOloYllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/nahtavillaolo";
}

export function linkHyvaksymismenettelyssaYllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/hyvaksymismenettelyssa";
}

export function linkHyvaksymisPaatosYllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/hyvaksymispaatos";
}

export function linkJatkoPaatos1Yllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/jatkaminen1";
}

export function linkJatkoPaatos2Yllapito(oid: string): string {
  return linkSuunnitelmaYllapito(oid) + "/jatkaminen2";
}
