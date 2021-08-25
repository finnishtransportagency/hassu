import { CreateSuunnitelmaInput, Status, Suunnitelma } from "../../src/api/API";

export class SuunnitelmaFixture {
  public SUUNNITELMA_NAME_1 = "Test Suunnitelma 1";
  public SUUNNITELMA_ID_1 = "1";

  createSuunnitelmaInput: CreateSuunnitelmaInput = {
    name: this.SUUNNITELMA_NAME_1,
  };

  suunnitelma1 = {
    id: this.SUUNNITELMA_ID_1,
    name: this.SUUNNITELMA_NAME_1,
    status: Status.EI_JULKAISTU,
  } as Suunnitelma;
}
