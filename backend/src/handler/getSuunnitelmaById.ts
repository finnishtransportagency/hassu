import suunnitelmatDatabase from "../database/suunnitelmatDatabase";
import { SuunnitelmaAdapter } from "./suunnitelmaAdapter";

const suunnitelmaAdapter = new SuunnitelmaAdapter();

export async function getSuunnitelmaById(suunnitelmaId: string) {
  const dbSuunnitelma = await suunnitelmatDatabase.getSuunnitelmaById(suunnitelmaId);
  return suunnitelmaAdapter.createSuunnitelmaResponse(dbSuunnitelma);
}
