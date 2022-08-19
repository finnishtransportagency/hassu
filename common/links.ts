export function linkAloituskuulutus(oid: string): string {
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/suunnitelma/" + oid + "/aloituskuulutus";
}

export function linkSuunnitteluVaihe(oid: string): string {
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/suunnitelma/" + oid + "/suunnittelu";
}

export function linkHyvaksymisPaatos(oid: string): string {
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/suunnitelma/" + oid + "/hyvaksymispaatos";
}
