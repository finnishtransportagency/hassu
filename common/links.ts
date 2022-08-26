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
