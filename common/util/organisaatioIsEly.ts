export const ELY_ORGANISAATIO_STRING = "ELY";

export function organisaatioIsEly(organisaatio: string | undefined | null): boolean {
  return organisaatio?.toUpperCase() === ELY_ORGANISAATIO_STRING;
}

export const EVK_ORGANISAATIO_STRING = "Elinvoimakeskus";

export function organisaatioIsEvk(organisaatio: string | undefined | null): boolean {
  return organisaatio?.toUpperCase() === EVK_ORGANISAATIO_STRING.toUpperCase();
}
