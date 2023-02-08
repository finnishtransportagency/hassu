export const ELY_ORGANISAATIO_STRING = "ELY";

export function organisaatioIsEly(organisaatio: string | undefined | null): boolean {
  return organisaatio?.toUpperCase() === ELY_ORGANISAATIO_STRING;
}
