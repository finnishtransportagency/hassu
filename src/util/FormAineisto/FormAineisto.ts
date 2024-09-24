import { Aineisto, AineistoTila } from "@services/api";

export type FormAineisto = Omit<Aineisto, "tila" | "__typename"> & {
  tila: AineistoTila | null;
};
