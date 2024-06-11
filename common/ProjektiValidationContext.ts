import { HyvaksymisPaatosVaihe, KayttoOikeusTiedot, Projekti, ProjektiKayttajaInput } from "./graphql/apiModel";

export interface ProjektiLisatiedot {
  nykyinenKayttaja: Omit<KayttoOikeusTiedot, "__typename">;
}

export type ProjektiLisatiedolla = Projekti & ProjektiLisatiedot;

export enum ValidationMode {
  DRAFT = "DRAFT",
  PUBLISH = "PUBLISH",
}

// Tyypitys kopioitu reactista, jottei tarvitse importoida reactia tässä common komponentissa
interface MutableRefObject<T> {
  current: T;
}

export type ValidationModeState = MutableRefObject<ValidationMode> | undefined;

export type ProjektiValidationContext = {
  projekti?: ProjektiLisatiedolla;
  isRuotsinkielinenProjekti?: MutableRefObject<boolean>;
  hasEuRahoitus?: MutableRefObject<boolean>;
  validationMode?: ValidationModeState;
  paatos?: HyvaksymisPaatosVaihe | null;
  kayttajat?: ProjektiKayttajaInput[];
};
