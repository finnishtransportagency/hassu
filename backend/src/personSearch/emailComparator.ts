const ELY_EMAIL_DOMAIN = "ely-keskus.fi";
const EVK_EMAIL_DOMAIN = "elinvoimakeskus.fi";

export class EmailComparator {
  // Kohdellaan näitä domaineja samana -> email vertailu näiden osalta lokaalin osan perusteella
  private readonly EQUIVALENT_EMAIL_DOMAINS = new Set([ELY_EMAIL_DOMAIN, EVK_EMAIL_DOMAIN]);

  private splitEmailParts(address: string): { local: string; domain: string } {
    const [local, domain] = address.toLowerCase().trim().split("@");
    return { local, domain };
  }

  private doEmailPartsMatch(a: { local: string; domain: string }, b: { local: string; domain: string }): boolean {
    const bothEquivalent = this.EQUIVALENT_EMAIL_DOMAINS.has(a.domain) && this.EQUIVALENT_EMAIL_DOMAINS.has(b.domain);
    return bothEquivalent
      ? a.local === b.local // ely and evk are interchangeable
      : a.local === b.local && a.domain === b.domain; // rest needs full match just like before
  }

  public doEmailsMatch(a: string, b: string): boolean {
    return this.doEmailPartsMatch(this.splitEmailParts(a), this.splitEmailParts(b));
  }
}
