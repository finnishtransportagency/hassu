import { Kieli } from "./graphql/apiModel";

export function linkSuunnitelma(oid: string, kieli: Kieli): string {
  let langPrefix = "";
  if (kieli == Kieli.RUOTSI) {
    langPrefix = "/sv";
  }
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + langPrefix + "/suunnitelma/" + oid;
}

export function linkAloituskuulutus(oid: string, kieli: Kieli): string {
  return linkSuunnitelma(oid, kieli) + "/aloituskuulutus";
}

export function linkSuunnitteluVaihe(oid: string, kieli: Kieli): string {
  return linkSuunnitelma(oid, kieli) + "/suunnittelu";
}

export function linkNahtavillaOlo(oid: string, kieli: Kieli): string {
  return linkSuunnitelma(oid, kieli) + "/nahtavillaolo";
}

export function linkHyvaksymismenettelyssa(oid: string, kieli: Kieli): string {
  return linkSuunnitelma(oid, kieli) + "/hyvaksymismenettelyssa";
}

export function linkHyvaksymisPaatos(oid: string, kieli: Kieli): string {
  return linkSuunnitelma(oid, kieli) + "/hyvaksymispaatos";
}

export function linkSuunnitelmaYllapito(oid: string): string {
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/yllapito/projekti/" + oid;
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
