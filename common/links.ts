export function linkSuunnitteluVaihe(oid: string): string {
  return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/suunnitelma/" + oid + "/suunnittelu";
}
