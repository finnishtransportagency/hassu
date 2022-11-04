import { isInteger } from "lodash";
import { NextRouter } from "next/router";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

export const getValidatedKierrosId = (router: NextRouter, projekti: ProjektiLisatiedolla) => {
  const kierrosId = router.query.kierrosId;
  const vuorovaikutukset = projekti.suunnitteluVaihe?.vuorovaikutukset;
  return typeof kierrosId === "string" &&
    !isInteger(kierrosId) &&
    vuorovaikutukset?.some((vuorovaikutus) => vuorovaikutus.vuorovaikutusNumero === parseInt(kierrosId) || kierrosId === "1")
    ? parseInt(kierrosId)
    : undefined;
};
