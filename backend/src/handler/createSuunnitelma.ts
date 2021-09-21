import { CreateSuunnitelmaInput } from "../api/apiModel";
import { Status, Suunnitelma } from "../model/suunnitelma";
import suunnitelmatDatabase from "../database/suunnitelmatDatabase";
import { requireVaylaUser } from "../service/userService";

const { v4: uuid } = require("uuid");

export async function createSuunnitelma(input: CreateSuunnitelmaInput) {
  requireVaylaUser();
  const suunnitelma = { ...input } as Suunnitelma;
  suunnitelma.id = uuid();
  suunnitelma.status = Status.EI_JULKAISTU;
  await suunnitelmatDatabase.createSuunnitelma(suunnitelma);
  return suunnitelma;
}
