import { DBVaylaUser } from "../database/model/projekti";
import { ProjektiKayttaja, ProjektiKayttajaInput, ProjektiRooli } from "../../../common/graphql/apiModel";
import { personSearch, SearchMode } from "../personSearch/personSearchClient";
import * as log from "loglevel";
import differenceWith from "lodash/differenceWith";

export class KayttoOikeudetManager {
  private users: DBVaylaUser[];

  constructor(users: DBVaylaUser[]) {
    this.users = users;
  }

  async applyChanges(changes: ProjektiKayttajaInput[] | undefined | null) {
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
        // Remove user because it doesn't exist in input, except projektipaallikko which cannot be removed
        if (currentUser.rooli === ProjektiRooli.PROJEKTIPAALLIKKO) {
          resultingUsers.push(currentUser);
        }
      }
      return resultingUsers;
    }, []);

    // Add new users
    const newUsers = differenceWith(changes, resultUsers, (u1, u2) => u1.kayttajatunnus === u2.kayttajatunnus);
    await Promise.all(
      newUsers.map(async (newUser) => {
        const userToAdd = {
          puhelinnumero: newUser.puhelinnumero,
          kayttajatunnus: newUser.kayttajatunnus,
          rooli: newUser.rooli,
        } as any;
        try {
          const userWithAllInfo = await personSearch.fillInUserInfoFromUserManagement({
            user: userToAdd,
            searchMode: SearchMode.UID,
          });
          if (userWithAllInfo) {
            resultUsers.push(userWithAllInfo);
          }
        } catch (e) {
          log.error(e);
        }
      })
    );
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

  async addProjektiPaallikkoFromEmail(vastuuhenkiloEmail: string) {
    return await this.resolveProjektiPaallikkoFromVelhoVastuuhenkilo(vastuuhenkiloEmail);
  }

  async resolveProjektiPaallikkoFromVelhoVastuuhenkilo(vastuuhenkiloEmail: string) {
    // Replace or create new projektipaallikko
    this.removeProjektiPaallikko();
    const projektiPaallikko = await personSearch.fillInUserInfoFromUserManagement({
      user: { rooli: ProjektiRooli.PROJEKTIPAALLIKKO, email: vastuuhenkiloEmail, esitetaanKuulutuksessa: true } as any,
      searchMode: SearchMode.EMAIL,
    });
    if (projektiPaallikko) {
      this.users.push(projektiPaallikko);
      return projektiPaallikko;
    }
  }

  async addUserByKayttajatunnus(kayttajatunnus: string, rooli: ProjektiRooli) {
    const user = await personSearch.fillInUserInfoFromUserManagement({
      user: { kayttajatunnus, rooli } as any,
      searchMode: SearchMode.UID,
    });
    if (user) {
      this.users.push(user);
      return user;
    }
  }

  private removeProjektiPaallikko() {
    this.users = this.users.filter((user) => user.rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  }
}
