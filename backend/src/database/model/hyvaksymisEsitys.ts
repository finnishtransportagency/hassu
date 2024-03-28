import * as API from "hassu-common/graphql/apiModel";
import { Aineisto, KunnallinenLadattuTiedosto, LadattuTiedosto, Laskutustiedot, SahkopostiVastaanottaja } from "./common";

export interface IHyvaksymisEsitys {
  poistumisPaiva: string;
  kiireellinen?: boolean | null;
  lisatiedot?: string | null;
  laskutustiedot?: Laskutustiedot | null;
  hyvaksymisEsitys?: Array<LadattuTiedosto> | null;
  suunnitelma?: Array<Aineisto> | null;
  muistutukset?: Array<KunnallinenLadattuTiedosto> | null;
  lausunnot?: Array<LadattuTiedosto> | null;
  maanomistajaluettelo?: Array<LadattuTiedosto> | null;
  kuulutuksetJaKutsu?: Array<LadattuTiedosto> | null;
  muuAineistoVelhosta?: Array<Aineisto> | null;
  muuAineistoKoneelta?: Array<LadattuTiedosto> | null;
  vastaanottajat?: Array<SahkopostiVastaanottaja> | null;
  muokkaaja?: string | null;
}

export type MuokattavaHyvaksymisEsitys = {
  tila?: API.HyvaksymisTila | null;
  palautusSyy?: string | null;
} & IHyvaksymisEsitys;

export type JulkaistuHyvaksymisEsitys = {
  hyvaksyja?: string | null;
  hyvaksymisPaiva?: string | null;
  aineistopaketti?: string;
} & IHyvaksymisEsitys;
