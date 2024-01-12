import { DBProjekti, LadattuTiedosto } from "../../database/model";
import { PathTuple } from "../../files/ProjektiPath";
import { Path } from "react-hook-form";

export type LadattuTiedostoPathsPair = {
  tiedostot: LadattuTiedosto[] | LadattuTiedosto | null | undefined;
  paths: PathTuple;
  pathInDBProjekti: Path<DBProjekti>;
};
