import { AineistoInputNew } from "@services/api";

/**
 *
 * @param oldAineisto aineistot, jotka oli valittu jo ennestään
 * @param valitutAineistot juuri äskettäin valitut aineistot
 * @returns valitutAineistot, mutta poistettu ne, jotka oli jo valittu
 */
export function getNewAineistot(
  oldAineisto: AineistoInputNew[] | undefined | null,
  valitutAineistot: AineistoInputNew[] | undefined | null
): AineistoInputNew[] {
  const dokumenttiOids = (oldAineisto ?? []).map((aineisto) => aineisto.dokumenttiOid);
  return (valitutAineistot ?? []).filter((aineisto) => !dokumenttiOids.includes(aineisto.dokumenttiOid));
}
