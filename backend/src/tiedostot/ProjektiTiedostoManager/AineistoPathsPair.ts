import { Path } from "react-hook-form";
import { Aineisto, DBProjekti } from "../../database/model";
import { PathTuple } from "../../files/ProjektiPath";

export type AineistoPathsPair = {
  aineisto: Aineisto[] | null | undefined;
  paths: PathTuple;
  pathInDBProjekti: Path<DBProjekti>;
};
