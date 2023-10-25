import { Aineisto } from "../../database/model";
import { PathTuple } from "../../files/ProjektiPath";

export type AineistoPathsPair = { aineisto: Aineisto[] | null | undefined; paths: PathTuple };
