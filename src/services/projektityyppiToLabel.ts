import { ProjektiTyyppi } from "../../common/graphql/apiModel";

// TODO Move mapping to localization
type ProjektiTyyppiToLabel = {
  readonly [PT in ProjektiTyyppi]: string;
};

export const projektiTyyppiToLabel: ProjektiTyyppiToLabel = {
  [ProjektiTyyppi.YLEINEN]: "Yleissuunnitelma",
  [ProjektiTyyppi.TIE]: "Tiesuunnitelma",
  [ProjektiTyyppi.RATA]: "Ratasuunnitelma",
} as const;
