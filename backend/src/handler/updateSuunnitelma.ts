import { UpdateSuunnitelmaInput } from "../api/apiModel";
import { Suunnitelma } from "../model/suunnitelma";
import suunnitelmatDatabase from "../database/suunnitelmatDatabase";
import { requireVaylaUser } from "../service/userService";

export async function updateSuunnitelma(input: UpdateSuunnitelmaInput) {
  requireVaylaUser();
  const suunnitelma = { ...input } as Suunnitelma;
  await suunnitelmatDatabase.updateSuunnitelma(suunnitelma);
  return suunnitelma;
}
