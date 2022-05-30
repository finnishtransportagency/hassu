import { DBVaylaUser } from "../database/model/projekti";
import { Kayttaja, ProjektiKayttaja, ProjektiKayttajaInput, ProjektiRooli } from "../../../common/graphql/apiModel";
import { SearchMode } from "../personSearch/personSearchClient";
import { log } from "../logger";
import differenceWith from "lodash/differenceWith";
import { isAorL } from "../user";
import { mergeKayttaja } from "../personSearch/personAdapter";
import { Kayttajas } from "../personSearch/kayttajas";

export class KayttoOikeudetManager {
  private users: DBVaylaUser[];
  private readonly kayttajas: Kayttajas;

  constructor(users: DBVaylaUser[], kayttajas: Kayttajas) {
    this.users = users;
    this.kayttajas = kayttajas;
  }

  applyChanges(changes: ProjektiKayttajaInput[] | undefined | null): DBVaylaUser[] | undefined {
    if (!changes) {
      return;
    }
    // Go through all users in database projekti and the input.
    // Update existing ones, remove those that are missing in input, and add those that exist only in input.
    const resultUsers: DBVaylaUser[] = this.users.reduce((resultingUsers: DBVaylaUser[], currentUser) => {
      const inputUser = changes.find((user) => user.kayttajatunnus === currentUser.kayttajatunnus);
      if (inputUser) {
        // Update only puhelinnumero and force esitetaanKuulutuksessa to be true if projektipaallikko
        if (inputUser.rooli === ProjektiRooli.PROJEKTIPAALLIKKO) {
          resultingUsers.push({
            ...currentUser,
            puhelinnumero: inputUser.puhelinnumero,
            esitetaanKuulutuksessa: true,
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
    newUsers.map((newUser) => {
      const userToAdd = {
        puhelinnumero: newUser.puhelinnumero,
        kayttajatunnus: newUser.kayttajatunnus,
        rooli: newUser.rooli,
        esitetaanKuulutuksessa:
          newUser.rooli === ProjektiRooli.PROJEKTIPAALLIKKO ? true : newUser.esitetaanKuulutuksessa,
      } as Partial<DBVaylaUser>;
      try {
        const userWithAllInfo = this.fillInUserInfoFromUserManagement({
          user: userToAdd,
          searchMode: SearchMode.UID,
        });
        if (userWithAllInfo) {
          resultUsers.push(userWithAllInfo);
        }
      } catch (e) {
        log.error(e);
      }
    });
    this.users = resultUsers;
  }

  getKayttoOikeudet() : DBVaylaUser[]{
    return this.users;
  }

  static adaptAPIKayttoOikeudet(users: DBVaylaUser[]): ProjektiKayttaja[] {
    return users.map((user) => ({
      __typename: "ProjektiKayttaja",
      ...user,
    }));
  }

  addProjektiPaallikkoFromEmail(vastuuhenkiloEmail: string) : DBVaylaUser|undefined{
    return this.resolveProjektiPaallikkoFromVelhoVastuuhenkilo(vastuuhenkiloEmail);
  }

  resolveProjektiPaallikkoFromVelhoVastuuhenkilo(vastuuhenkiloEmail: string): DBVaylaUser|undefined {
    // Replace or create new projektipaallikko
    this.removeProjektiPaallikko();
    const projektiPaallikko = this.fillInUserInfoFromUserManagement({
      user: {
        rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
        email: vastuuhenkiloEmail,
        esitetaanKuulutuksessa: true,
      },
      searchMode: SearchMode.EMAIL,
    });
    if (projektiPaallikko) {
      this.users.push(projektiPaallikko);
      return projektiPaallikko;
    }
  }

  addUserByKayttajatunnus(kayttajatunnus: string, rooli: ProjektiRooli) : DBVaylaUser | undefined{
    const user = this.fillInUserInfoFromUserManagement({
      user: { kayttajatunnus, rooli } as Partial<DBVaylaUser>,
      searchMode: SearchMode.UID,
    });
    if (user) {
      this.users.push(user);
      return user;
    }
  }

  private fillInUserInfoFromUserManagement({
    user: user,
    searchMode,
  }: {
    user: Partial<DBVaylaUser>;
    searchMode: SearchMode;
  }): DBVaylaUser | undefined {
    const kayttajas = this.kayttajas;
    let account: Kayttaja | undefined;

    if (searchMode === SearchMode.UID) {
      account = kayttajas.getKayttajaByUid(user.kayttajatunnus);
    } else {
      account = kayttajas.findByEmail(user.email);
    }
    if (account) {
      // Projektipaallikko must be either L or A account
      if (user.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && !isAorL(account)) {
        return;
      }
      mergeKayttaja(user, account);
      return user as DBVaylaUser;
    }
  }

  private removeProjektiPaallikko() {
    this.users = this.users.filter((user) => user.rooli === ProjektiRooli.PROJEKTIPAALLIKKO);
  }
}
