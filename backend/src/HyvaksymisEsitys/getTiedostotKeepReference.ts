import { IHyvaksymisEsitys, ILadattuTiedosto, AineistoNew } from "../database/model";

export default function getTiedostotKeepReference(hyvaksymisEsitys: IHyvaksymisEsitys): {
  aineistot: AineistoNew[];
  ladatutTiedostot: ILadattuTiedosto[];
} {
  const tiedostot: { aineistot: AineistoNew[]; ladatutTiedostot: ILadattuTiedosto[] } = { aineistot: [], ladatutTiedostot: [] };
  hyvaksymisEsitys.hyvaksymisEsitys && tiedostot.ladatutTiedostot.push(...hyvaksymisEsitys.hyvaksymisEsitys);
  hyvaksymisEsitys.kuulutuksetJaKutsu && tiedostot.ladatutTiedostot.push(...hyvaksymisEsitys.kuulutuksetJaKutsu);
  hyvaksymisEsitys.lausunnot && tiedostot.ladatutTiedostot.push(...hyvaksymisEsitys.lausunnot);
  hyvaksymisEsitys.maanomistajaluettelo && tiedostot.ladatutTiedostot.push(...hyvaksymisEsitys.maanomistajaluettelo);
  hyvaksymisEsitys.muistutukset && tiedostot.ladatutTiedostot.push(...hyvaksymisEsitys.muistutukset);
  hyvaksymisEsitys.muuAineistoKoneelta && tiedostot.ladatutTiedostot.push(...hyvaksymisEsitys.muuAineistoKoneelta);
  hyvaksymisEsitys.muuAineistoVelhosta && tiedostot.aineistot.push(...hyvaksymisEsitys.muuAineistoVelhosta);
  hyvaksymisEsitys.suunnitelma && tiedostot.aineistot.push(...hyvaksymisEsitys.suunnitelma);
  return tiedostot;
}
