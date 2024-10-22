import { DBProjekti } from "../database/model";
import getHyvaksymisEsityksenAineistot from "./getAineistot";
import { aineistoNewIsReady } from "./aineistoNewIsReady";

export default function aineistoImportPending({
  aineistoHandledAt,
  muokattavaHyvaksymisEsitys,
}: Pick<DBProjekti, "muokattavaHyvaksymisEsitys" | "aineistoHandledAt">): boolean {
  const aineistot = getHyvaksymisEsityksenAineistot(muokattavaHyvaksymisEsitys);
  return aineistot.some((aineisto) => !aineistoNewIsReady(aineisto, aineistoHandledAt));
}
