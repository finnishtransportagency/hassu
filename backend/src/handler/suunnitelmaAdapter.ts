import { Suunnitelma } from "../model/suunnitelma";
import * as API from "../api/API";

export class SuunnitelmaAdapter {
  public createSuunnitelmaResponse(dbSuunnitelma: Suunnitelma): API.Suunnitelma {
    return { ...dbSuunnitelma } as API.Suunnitelma;
  }
}
