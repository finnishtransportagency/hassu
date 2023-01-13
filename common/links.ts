export function linkSuunnitelma(oid: string): string {
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/suunnitelma/" + oid;
}

export function linkAloituskuulutus(oid: string): string {
  return linkSuunnitelma(oid) + "/aloituskuulutus";
}

export function linkSuunnitteluVaihe(oid: string): string {
  return linkSuunnitelma(oid) + "/suunnittelu";
}

export function linkNahtavillaOlo(oid: string): string {
  return linkSuunnitelma(oid) + "/nahtavillaolo";
}

export function linkHyvaksymismenettelyssa(oid: string): string {
  return linkSuunnitelma(oid) + "/hyvaksymismenettelyssa";
}

export function linkHyvaksymisPaatos(oid: string): string {
  return linkSuunnitelma(oid) + "/hyvaksymispaatos";
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
