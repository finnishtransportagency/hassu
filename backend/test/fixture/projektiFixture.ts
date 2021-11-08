import {
  Projekti,
  ProjektiRooli,
  ProjektiTyyppi,
  Status,
  TallennaProjektiInput,
} from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model/projekti";
import { pekkaProjariProjektiKayttaja } from "./users";

export class ProjektiFixture {
  public PROJEKTI1_NIMI = "Testiprojekti 1";
  public PROJEKTI1_KUVAUS_1 = "Testiprojekti 1:n kuvaus";
  public PROJEKTI1_KUVAUS_2 = "Testiprojekti 1:n kuvaus 2";
  public PROJEKTI1_OID = "1";

  tallennaProjektiInput: TallennaProjektiInput = {
    oid: this.PROJEKTI1_OID,
  };

  projekti1: Projekti = {
    __typename: "Projekti",
    oid: this.PROJEKTI1_OID,
    nimi: this.PROJEKTI1_NIMI,
    kuvaus: this.PROJEKTI1_KUVAUS_1,
    status: Status.EI_JULKAISTU,
    tallennettu: false,
    kayttoOikeudet: [pekkaProjariProjektiKayttaja],
    tyyppi: ProjektiTyyppi.TIE,
  };

  velhoprojekti1: DBProjekti = {
    oid: this.PROJEKTI1_OID,
    nimi: this.PROJEKTI1_NIMI,
    kuvaus: this.PROJEKTI1_KUVAUS_1,
    kayttoOikeudet: [],
    tyyppi: ProjektiTyyppi.TIE,
  };

  dbProjekti1: DBProjekti = {
    kayttoOikeudet: [
      {
        rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
        email: pekkaProjariProjektiKayttaja.email,
        kayttajatunnus: pekkaProjariProjektiKayttaja.kayttajatunnus,
        nimi: pekkaProjariProjektiKayttaja.nimi,
        puhelinnumero: pekkaProjariProjektiKayttaja.puhelinnumero,
        organisaatio: pekkaProjariProjektiKayttaja.organisaatio,
      },
    ],
    oid: this.PROJEKTI1_OID,
    nimi: this.PROJEKTI1_NIMI,
    kuvaus: this.PROJEKTI1_KUVAUS_1,
    status: Status.EI_JULKAISTU,
  };
}
