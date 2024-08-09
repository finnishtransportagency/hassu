import * as API from "hassu-common/graphql/apiModel";
import { AineistoNew, KunnallinenLadattuTiedosto, LadattuTiedostoNew, Laskutustiedot, SahkopostiVastaanottaja } from "./common";

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
