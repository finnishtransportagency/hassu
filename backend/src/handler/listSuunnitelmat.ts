import suunnitelmatDatabase from "../database/suunnitelmatDatabase";
import { SuunnitelmaAdapter } from "./suunnitelmaAdapter";

const suunnitelmaAdapter = new SuunnitelmaAdapter();

export async function listSuunnitelmat() {
  const dbSuunnitelmat = await suunnitelmatDatabase.listSuunnitelmat();
  return dbSuunnitelmat.map(suunnitelmaAdapter.createSuunnitelmaResponse);
}
