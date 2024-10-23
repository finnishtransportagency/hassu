import * as API from "hassu-common/graphql/apiModel";
import { AineistoNew, KunnallinenLadattuTiedosto, LadattuTiedostoNew, Laskutustiedot, SahkopostiVastaanottaja } from "./common";
import { DBProjekti } from "./projekti";

export interface IHyvaksymisEsitys {
  kiireellinen?: boolean | null;
  lisatiedot?: string | null;
  laskutustiedot?: Laskutustiedot | null;
  hyvaksymisEsitys?: Array<LadattuTiedostoNew> | null;
  suunnitelma?: Array<AineistoNew> | null;
  muistutukset?: Array<KunnallinenLadattuTiedosto> | null;
  lausunnot?: Array<LadattuTiedostoNew> | null;
  maanomistajaluettelo?: Array<LadattuTiedostoNew> | null;
  kuulutuksetJaKutsu?: Array<LadattuTiedostoNew> | null;
  muuAineistoVelhosta?: Array<AineistoNew> | null;
  muuAineistoKoneelta?: Array<LadattuTiedostoNew> | null;
  vastaanottajat?: Array<SahkopostiVastaanottaja> | null;
  muokkaaja?: string | null;
  versio: number;
}

export type MuokattavaHyvaksymisEsitys = {
  poistumisPaiva?: string | null;
  tila?: API.HyvaksymisTila | null;
  palautusSyy?: string | null;
} & IHyvaksymisEsitys;

export type JulkaistuHyvaksymisEsitys = {
  poistumisPaiva: string;
  hyvaksyja?: string | null;
  hyvaksymisPaiva?: string | null;
  asianhallintaEventId?: string | null;
} & IHyvaksymisEsitys;

const muokattavaHyvaksymisEsitysKey: keyof DBProjekti = "muokattavaHyvaksymisEsitys";
const julkaistuHyvaksymisEsitysKey: keyof DBProjekti = "julkaistuHyvaksymisEsitys";

export const HYVAKSYMISESITYS_KEYS = [muokattavaHyvaksymisEsitysKey, julkaistuHyvaksymisEsitysKey] as const;
type HyvaksymisesitysKeyTuple = typeof HYVAKSYMISESITYS_KEYS;
export type HyvaksymisesitysKey = HyvaksymisesitysKeyTuple[number];

const hyvaksymisEsitysKey: keyof IHyvaksymisEsitys = "hyvaksymisEsitys";
const kuulutuksetJaKutsuKey: keyof IHyvaksymisEsitys = "kuulutuksetJaKutsu";
const lausunnotKey: keyof IHyvaksymisEsitys = "lausunnot";
const maanomistajaluetteloKey: keyof IHyvaksymisEsitys = "maanomistajaluettelo";
const muistutuksetKey: keyof IHyvaksymisEsitys = "muistutukset";
const muuAineistoKoneeltaKey: keyof IHyvaksymisEsitys = "muuAineistoKoneelta";
const muuAineistoVelhostaKey: keyof IHyvaksymisEsitys = "muuAineistoVelhosta";
const suunnitelmaKey: keyof IHyvaksymisEsitys = "suunnitelma";

export const HYVAKSYMISESITYS_TIEDOSTO_KEYS = [
  hyvaksymisEsitysKey,
  kuulutuksetJaKutsuKey,
  lausunnotKey,
  maanomistajaluetteloKey,
  muistutuksetKey,
  muuAineistoKoneeltaKey,
  muuAineistoVelhostaKey,
  suunnitelmaKey,
] as const;

type HyvaksymisesitysTiedostoKeyTuple = typeof HYVAKSYMISESITYS_TIEDOSTO_KEYS;

export type HyvaksymisesitysTiedostoKey = HyvaksymisesitysTiedostoKeyTuple[number];
