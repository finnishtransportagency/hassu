import { LadattuTiedosto } from "../../database/model";
import { PathTuple } from "../../files/ProjektiPath";

export type LadattuTiedostoPathsPair = { tiedostot: LadattuTiedosto[] | null | undefined; paths: PathTuple };
