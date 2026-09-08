export const EVK_ORGANISAATIO_STRING = "Elinvoimakeskus";

export function organisaatioIsEvk(organisaatio: string | undefined | null): boolean {
  return organisaatio?.toUpperCase() === EVK_ORGANISAATIO_STRING.toUpperCase();
}
