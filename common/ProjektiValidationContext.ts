import { MutableRefObject } from "react";
import { HyvaksymisPaatosVaihe, KayttoOikeusTiedot, Projekti, ProjektiKayttajaInput } from "./graphql/apiModel";

export interface ProjektiLisatiedot {
  nykyinenKayttaja: Omit<KayttoOikeusTiedot, "__typename">;
}

export type ProjektiLisatiedolla = Projekti & ProjektiLisatiedot;

export enum ValidationMode {
  DRAFT = "DRAFT",
  PUBLISH = "PUBLISH",
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
