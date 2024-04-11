import { IHyvaksymisEsitys, AineistoNew } from "../database/model";

export default function getHyvaksymisEsityksenAineistot(hyvaksymisEsitys: IHyvaksymisEsitys | null | undefined): AineistoNew[] {
  if (!hyvaksymisEsitys) {
    return [] as AineistoNew[];
  }
  const aineistot: AineistoNew[] = [];
  hyvaksymisEsitys.muuAineistoVelhosta && aineistot.push(...hyvaksymisEsitys.muuAineistoVelhosta);
  hyvaksymisEsitys.suunnitelma && aineistot.push(...hyvaksymisEsitys.suunnitelma);
  return aineistot;
}
