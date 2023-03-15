import { Kieli } from "./graphql/apiModel";
import { DBProjekti } from "../backend/src/database/model";

export type LinkableProjekti = Pick<DBProjekti, "oid" | "lyhytOsoite">;

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

export function linkAloituskuulutus(projekti: LinkableProjekti, kieli: Kieli): string {
  return linkSuunnitelma(projekti, kieli) + "/aloituskuulutus";
}

export function linkSuunnitteluVaihe(projekti: LinkableProjekti, kieli: Kieli): string {
  return linkSuunnitelma(projekti, kieli) + "/suunnittelu";
}

export function linkNahtavillaOlo(projekti: LinkableProjekti, kieli: Kieli): string {
  return linkSuunnitelma(projekti, kieli) + "/nahtavillaolo";
}

export function linkHyvaksymismenettelyssa(projekti: LinkableProjekti, kieli: Kieli): string {
  return linkSuunnitelma(projekti, kieli) + "/hyvaksymismenettelyssa";
}

export function linkHyvaksymisPaatos(projekti: LinkableProjekti, kieli: Kieli): string {
  return linkSuunnitelma(projekti, kieli) + "/hyvaksymispaatos";
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
