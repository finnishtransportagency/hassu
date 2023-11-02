import { Aineisto, LadattuTiedosto } from "./common";

export type LausuntoPyynto = {
  uuid: string;
  legacy?: number; //nahtavillaoloVaiheId
  poistumisPaiva: string;
  lisaAineistot?: Array<Aineisto>;
  aineistopaketti?: string;
  muistiinpano?: string;
  poistetaan?: boolean;
};

export type LausuntoPyynnonTaydennys = {
  kunta: number;
  uuid: string;
  poistumisPaiva: string;
  muistutukset?: Array<LadattuTiedosto>;
  muuAineisto?: Array<Aineisto>;
  aineistopaketti?: string;
  poistetaan?: boolean;
};
