import { isInteger } from "lodash";
import { NextRouter } from "next/router";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

export const getValidatedKierrosId = (router: NextRouter, projekti: ProjektiLisatiedolla) => {
  const kierrosId = router.query.kierrosId;
  const vuorovaikutusKierrokset = projekti.vuorovaikutusKierrosJulkaisut;
  return typeof kierrosId === "string" &&
    !isInteger(kierrosId) &&
    !!(vuorovaikutusKierrokset?.[parseInt(kierrosId) - 1] || kierrosId === "1")
    ? parseInt(kierrosId)
    : undefined;
};
