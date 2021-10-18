import { DBProjekti, DBVaylaUser } from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import { ProjektiKayttaja, ProjektiKayttajaInput, ProjektiRooli } from "../../../common/graphql/apiModel";
import * as _ from "lodash";

function removeUndefinedFields(object: any) {
  return _.pickBy(object, _.identity);
}

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti): API.Projekti {
    const { kayttoOikeudet, ...fieldsToCopyAsIs } = dbProjekti;
    return {
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: ProjektiAdapter.adaptKayttoOikeudetToAPI(dbProjekti.kayttoOikeudet),
      ...fieldsToCopyAsIs,
    };
  }

  adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): DBProjekti {
    // Pick only fields that are relevant to DB
    const { oid, kuvaus, kayttoOikeudet } = changes;
    return removeUndefinedFields(
      _.mergeWith(
        {},
        { oid, kuvaus, kayttoOikeudet: this.adaptKayttoOikeudetToDB(projekti.kayttoOikeudet, kayttoOikeudet) }
      )
    ) as DBProjekti;
  }

  private static adaptKayttoOikeudetToAPI(users: DBVaylaUser[]): ProjektiKayttaja[] {
    return users.map((user) => ({
      __typename: "ProjektiKayttaja",
      ...user,
    }));
  }

  private adaptKayttoOikeudetToDB(currentUsers: DBVaylaUser[], input?: ProjektiKayttajaInput[] | null): DBVaylaUser[] {
    if (!input) {
      return currentUsers;
    }
    // Go through all users in database projekti and the input.
    // Update existing ones, remove those that are missing in input, and add those that exist only in input.
    const resultUsers: DBVaylaUser[] = currentUsers.reduce((resultingUsers: DBVaylaUser[], currentUser) => {
      const inputUser = input.find((user) => user.kayttajatunnus === currentUser.kayttajatunnus);
      if (inputUser) {
        // Update only puhelinnumero if projektipaallikko
        if (inputUser.rooli === ProjektiRooli.PROJEKTIPAALLIKKO) {
          resultingUsers.push({
            ...currentUser,
            puhelinnumero: inputUser.puhelinnumero,
          });
        } else {
          // Update rest of fields
          resultingUsers.push({
            ...currentUser,
            ...inputUser,
          });
        }
      } else {
        // Remove user because it doesn't exist in input
      }
      return resultingUsers;
    }, []);

    // Add new users
    input
      .filter((inputUser) => resultUsers.find((user) => user.kayttajatunnus !== inputUser.kayttajatunnus))
      .forEach((newUser) => {
        resultUsers.push({
          puhelinnumero: newUser.puhelinnumero,
          kayttajatunnus: newUser.kayttajatunnus,
          rooli: newUser.rooli,
          organisaatio: newUser.organisaatio,
          nimi: newUser.nimi,
          email: newUser.email,
        });
      });

    return resultUsers;
  }

  mergeProjektiInput(projekti: DBProjekti, input: API.TallennaProjektiInput) {
    return _.mergeWith(projekti, input);
  }
}
