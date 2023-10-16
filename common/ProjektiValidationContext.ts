import { MutableRefObject } from "react";
import { HyvaksymisPaatosVaihe, Projekti, ProjektiKayttajaInput } from "./graphql/apiModel";

export interface ProjektiLisatiedot {
  nykyinenKayttaja: {
    omaaMuokkausOikeuden: boolean;
    onProjektipaallikkoTaiVarahenkilo: boolean;
    onYllapitaja: boolean;
  };
  asianhallinta: {
    asianhallintaAktivoitavissa: boolean;
    asianhallintaAktiivinen: boolean;
  };
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
