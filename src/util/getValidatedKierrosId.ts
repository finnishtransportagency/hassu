import isInteger from "lodash/isInteger";
import { NextRouter } from "next/router";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

const isPositiveInteger = (num: number) => {
  return isInteger(num) && num > 0;
};

export function getValidatedKierrosId(router: NextRouter, projekti: ProjektiLisatiedolla): number | undefined {
  const kierrosId = router.query.kierrosId;
  const vuorovaikutusKierrokset = projekti.vuorovaikutusKierrosJulkaisut;

  // Query param kierrosId must be of type string and must represent a positive integer
  if (typeof kierrosId !== "string" || !isPositiveInteger(parseFloat(kierrosId))) {
    return undefined;
  }

  const integerValue = parseInt(kierrosId);

  // Valid kierrosId must be index of vuorovaikutusKierrokset (conversion to zero-based indexing is required) or 1
  return !!(vuorovaikutusKierrokset?.[integerValue - 1] || integerValue === 1) ? integerValue : undefined;
}
