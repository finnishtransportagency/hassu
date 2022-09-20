export function findJulkaisutWithTila<J, T>(julkaisut: (J & { tila?: T })[] | undefined | null, tila: T): J[] | undefined {
  return julkaisut?.filter((julkaisu) => julkaisu.tila == tila);
}

export function findJulkaisuWithTila<J, T>(julkaisut: (J & { tila?: T })[] | undefined | null, tila: T): J | undefined {
  return findJulkaisutWithTila(julkaisut, tila)?.pop();
}
