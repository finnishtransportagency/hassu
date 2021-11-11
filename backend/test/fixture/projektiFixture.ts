import {
  Projekti,
  ProjektiKayttaja,
  ProjektiRooli,
  ProjektiTyyppi,
  Status,
  TallennaProjektiInput,
} from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model/projekti";

export class ProjektiFixture {
  public PROJEKTI1_NIMI = "Testiprojekti 1";
  public PROJEKTI1_KUVAUS_1 = "Testiprojekti 1:n kuvaus";
  public PROJEKTI1_KUVAUS_2 = "Testiprojekti 1:n kuvaus 2";
  public PROJEKTI1_OID = "1";

  static pekkaProjariProjektiKayttaja: ProjektiKayttaja = {
    kayttajatunnus: "A123",
    __typename: "ProjektiKayttaja",
    rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
    nimi: "Projari, Pekka",
    email: "pekka.projari@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
  };

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
    kayttoOikeudet: [ProjektiFixture.pekkaProjariProjektiKayttaja],
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
        email: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.pekkaProjariProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero,
        organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio,
      },
    ],
    oid: this.PROJEKTI1_OID,
    nimi: this.PROJEKTI1_NIMI,
    kuvaus: this.PROJEKTI1_KUVAUS_1,
    status: Status.EI_JULKAISTU,
  };
}
