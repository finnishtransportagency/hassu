import { UpdateSuunnitelmaInput } from "../api/API";
import { Suunnitelma } from "../model/suunnitelma";
import suunnitelmatDatabase from "../database/suunnitelmatDatabase";

export async function updateSuunnitelma(input: UpdateSuunnitelmaInput) {
  const suunnitelma = { ...input } as Suunnitelma;
  await suunnitelmatDatabase.updateSuunnitelma(suunnitelma);
  return suunnitelma;
}
