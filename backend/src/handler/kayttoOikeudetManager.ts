import { DBVaylaUser } from "../database/model/projekti";
import { ProjektiKayttaja, ProjektiKayttajaInput, ProjektiRooli } from "../../../common/graphql/apiModel";

export class KayttoOikeudetManager {
  private users: DBVaylaUser[];

  constructor(users: DBVaylaUser[]) {
    this.users = users;
  }

  applyChanges(changes: ProjektiKayttajaInput[] | undefined | null) {
    if (!changes) {
      return;
    }
    // Go through all users in database projekti and the input.
    // Update existing ones, remove those that are missing in input, and add those that exist only in input.
    const resultUsers: DBVaylaUser[] = this.users.reduce((resultingUsers: DBVaylaUser[], currentUser) => {
      const inputUser = changes.find((user) => user.kayttajatunnus === currentUser.kayttajatunnus);
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
    changes
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
    this.users = resultUsers;
  }

  getKayttoOikeudet() {
    return this.users;
  }

  getAPIKayttoOikeudet(): ProjektiKayttaja[] {
    return this.users.map((user) => ({
      __typename: "ProjektiKayttaja",
      ...user,
    }));
  }
}
