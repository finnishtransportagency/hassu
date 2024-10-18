import { DBProjekti } from "../database/model";
import { aineistoNewIsReady } from "../HyvaksymisEsitys/aineistoNewIsReady";
import getHyvaksymisEsityksenAineistot from "../HyvaksymisEsitys/getAineistot";

export default function aineistoImportPending({
  aineistoHandledAt,
  ennakkoNeuvottelu,
}: Pick<DBProjekti, "ennakkoNeuvottelu" | "aineistoHandledAt">): boolean {
  const aineistot = getHyvaksymisEsityksenAineistot(ennakkoNeuvottelu);
  return aineistot.some((aineisto) => !aineistoNewIsReady(aineisto, aineistoHandledAt));
}
