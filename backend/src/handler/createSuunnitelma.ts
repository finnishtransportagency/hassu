import { CreateSuunnitelmaInput } from "../api/API";
import { Status, Suunnitelma } from "../model/suunnitelma";
import suunnitelmatDatabase from "../database/suunnitelmatDatabase";

const { v4: uuid } = require("uuid");

export async function createSuunnitelma(input: CreateSuunnitelmaInput) {
  const suunnitelma = { ...input } as Suunnitelma;
  suunnitelma.id = uuid();
  suunnitelma.status = Status.EI_JULKAISTU;
  await suunnitelmatDatabase.createSuunnitelma(suunnitelma);
  return suunnitelma;
}
