import { Projekti, Status, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model/projekti";

export class ProjektiFixture {
  public PROJEKTI1_NIMI = "Testiprojekti 1";
  public PROJEKTI1_KUVAUS_1 = "Testiprojekti 1:n kuvaus";
  public PROJEKTI1_KUVAUS_2 = "Testiprojekti 1:n kuvaus 2";
  public PROJEKTI1_OID = "1";

  tallennaProjektiInput: TallennaProjektiInput = {
    oid: this.PROJEKTI1_OID,
  };

  projekti1 = {
    __typename: "Projekti",
    oid: this.PROJEKTI1_OID,
    nimi: this.PROJEKTI1_NIMI,
    kuvaus: this.PROJEKTI1_KUVAUS_1,
    status: Status.EI_JULKAISTU,
    tallennettu: false,
  } as Projekti;

  dbProjekti1 = {
    oid: this.PROJEKTI1_OID,
    name: this.PROJEKTI1_NIMI,
    kuvaus: this.PROJEKTI1_KUVAUS_1,
    status: Status.EI_JULKAISTU,
  } as DBProjekti;
}
