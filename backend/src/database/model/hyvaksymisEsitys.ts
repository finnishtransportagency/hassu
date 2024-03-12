import * as API from "hassu-common/graphql/apiModel";
import { Aineisto, LadattuTiedosto, Laskutustiedot, SahkopostiVastaanottaja } from "./common";

export type HyvaksymisEsitys = {
  poistumisPaiva: string;
  kiireellinen?: boolean | null;
  lisatiedot?: string | null;
  laskutustiedot?: Laskutustiedot | null;
  hyvaksymisEsitys?: Array<LadattuTiedosto> | null;
  suunnitelma?: Array<Aineisto> | null;
  muistutukset?: Array<LadattuTiedosto> | null;
  lausunnot?: Array<LadattuTiedosto> | null;
  maanomistajaluettelo?: Array<LadattuTiedosto> | null;
  kuulutuksetJaKutsu?: Array<LadattuTiedosto> | null;
  muuAineistoVelhosta?: Array<Aineisto> | null;
  muuAineistoKoneelta?: Array<LadattuTiedosto> | null;
  vastaanottajat?: Array<SahkopostiVastaanottaja> | null;
  tila?: API.HyvaksymisTila | null;
  hyvaksyja?: string | null;
  hyvaksymisPaiva?: string | null;
  palautusSyy?: string | null;
  muokkaaja?: string | null;
  secret?: string | null; // TilaManageri asettaa hyväksymisen yhteydessä. Käytetään hashiin.
  aineistopaketti?: string;
};
