import { DBVaylaUser } from "../database/model";
import { Kayttaja, KayttajaTyyppi, ProjektiKayttaja, ProjektiKayttajaInput } from "../../../common/graphql/apiModel";
import { SearchMode } from "../personSearch/personSearchClient";
import { log } from "../logger";
import differenceWith from "lodash/differenceWith";
import remove from "lodash/remove";
import { mergeKayttaja } from "../personSearch/personAdapter";
import { Kayttajas } from "../personSearch/kayttajas";
import merge from "lodash/merge";
import { organisaatioIsEly } from "../util/organisaatioIsEly";

export class KayttoOikeudetManager {
  private users: DBVaylaUser[];
  private readonly kayttajas: Kayttajas;
  private kunnanEdustaja: string | undefined;

  constructor(users: DBVaylaUser[], kayttajas: Kayttajas, kunnanEdustaja?: string) {
    this.users = users;
    this.kayttajas = kayttajas;
    this.kunnanEdustaja = kunnanEdustaja;
  }

  applyChanges(changes: ProjektiKayttajaInput[] | undefined | null): DBVaylaUser[] | undefined {
    if (!changes) {
      return;
    }
    const resultUsers = this.modifyExistingUsers(changes);

    // Add new users
    this.addNewUsers(changes, resultUsers);
    this.users = resultUsers;
  }

  /**
   * Go through all users in database projekti and the input.
   * Update existing ones, remove those that are missing in input, and add those that exist only in input.   * @param changes
   */
  private modifyExistingUsers(changes: ProjektiKayttajaInput[]) {
    return this.users.reduce((resultingUsers: DBVaylaUser[], currentUser) => {
      const inputUser = changes.find((user) => user.kayttajatunnus === currentUser.kayttajatunnus);
      if (inputUser) {
        if (currentUser.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO) {
          // Update only puhelinnumero if projektipaallikko
          const elyOrganisaatio: DBVaylaUser["elyOrganisaatio"] =
            organisaatioIsEly(currentUser.organisaatio) && inputUser.elyOrganisaatio ? inputUser.elyOrganisaatio : undefined;
          resultingUsers.push({
            ...currentUser,
            elyOrganisaatio,
            yleinenYhteystieto: true,
            puhelinnumero: inputUser.puhelinnumero,
          });
        } else if (currentUser.muokattavissa === false) {
          // Update only puhelinnumero and yleinenYhteystieto if varahenkilö from Projektivelho
          const elyOrganisaatio: DBVaylaUser["elyOrganisaatio"] =
            organisaatioIsEly(currentUser.organisaatio) && inputUser.elyOrganisaatio ? inputUser.elyOrganisaatio : undefined;
          resultingUsers.push({
            ...currentUser,
            elyOrganisaatio,
            yleinenYhteystieto: !!inputUser.yleinenYhteystieto,
            puhelinnumero: inputUser.puhelinnumero,
          });
        } else {
          if (inputUser.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO) {
            // Tyyppiä ei voi vaihtaa projektipäälliköksi
            delete inputUser.tyyppi;
          }
          if (!organisaatioIsEly(currentUser.organisaatio)) {
            // Tyypille ei voi asettaa elyOrganisaatiota
            delete inputUser.elyOrganisaatio;
          }
          // Update rest of fields
          resultingUsers.push(merge({}, currentUser, inputUser));
        }
      } else {
        // Remove user because it doesn't exist in input, except if muokattavissa===false or user is kunnanEdustaja
        if (currentUser.muokattavissa === false || currentUser.kayttajatunnus === this.kunnanEdustaja) {
          resultingUsers.push(currentUser);
        }
      }
      return resultingUsers;
    }, []);
  }

  private addNewUsers(changes: ProjektiKayttajaInput[], resultUsers: DBVaylaUser[]) {
    const newUsers = differenceWith(changes, resultUsers, (u1, u2) => u1.kayttajatunnus === u2.kayttajatunnus);
    newUsers.forEach((newUser) => {
      const userToAdd: Partial<DBVaylaUser> = {
        puhelinnumero: newUser.puhelinnumero,
        kayttajatunnus: newUser.kayttajatunnus,
        muokattavissa: true,
        tyyppi: newUser.tyyppi == KayttajaTyyppi.VARAHENKILO ? KayttajaTyyppi.VARAHENKILO : undefined,
        yleinenYhteystieto: newUser.yleinenYhteystieto || undefined,
        elyOrganisaatio: newUser.elyOrganisaatio || undefined,
      };
      try {
        const userWithAllInfo = this.fillInUserInfoFromUserManagement({
          user: userToAdd,
          searchMode: SearchMode.UID,
        });
        if (userWithAllInfo) {
          resultUsers.push(userWithAllInfo);
        } else {
          log.warn("Käyttäjää ei löytynyt käyttäjähallinnasta", { userToAdd });
        }
      } catch (e) {
        log.error(e);
      }
    });
  }

  getKayttoOikeudet(): DBVaylaUser[] {
    return this.users;
  }

  static adaptAPIKayttoOikeudet(users: DBVaylaUser[]): ProjektiKayttaja[] {
    return users.map((user) => ({
      __typename: "ProjektiKayttaja",
      ...user,
    }));
  }

  addProjektiPaallikkoFromEmail(email: string | null | undefined): DBVaylaUser | undefined {
    if (email) {
      // Replace or create new projektipaallikko
      const projektiPaallikko = this.fillInUserInfoFromUserManagement({
        user: {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          email: email.toLowerCase(),
          yleinenYhteystieto: true,
          muokattavissa: false,
        },
        searchMode: SearchMode.EMAIL,
      });
      if (projektiPaallikko) {
        const currentProjektiPaallikko = this.users.filter((aUser) => aUser.email == email).pop();
        if (currentProjektiPaallikko?.kayttajatunnus == projektiPaallikko.kayttajatunnus) {
          log.warn("Projektipäällikkö oli jo olemassa käyytäjissä", { projektiPaallikko });
          // Make sure the user really is projektipäällikkö
          currentProjektiPaallikko.tyyppi = KayttajaTyyppi.PROJEKTIPAALLIKKO;
          currentProjektiPaallikko.muokattavissa = false;
          return currentProjektiPaallikko;
        } else {
          // Remove existing PROJEKTIPAALLIKKO if it's different from the new one
          const oldProjektiPaallikko = this.users.filter((aUser) => aUser.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO).pop();
          log.warn("Projektipäällikkö ei ole oikea", { current: oldProjektiPaallikko?.kayttajatunnus, theNew: projektiPaallikko });
          remove(this.users, (aUser) => aUser.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO && !aUser.muokattavissa);
          if (oldProjektiPaallikko && oldProjektiPaallikko.kayttajatunnus === this.kunnanEdustaja) {
            this.addOldProjektipaallikkoOrVarahenkiloAsRegularUser(oldProjektiPaallikko);
            log.warn("Vanha projektipäällikkö lisätty normaalikäyttäjäksi, koska hän on kunnan edustaja", { currentProjektiPaallikko });
          }
          this.users.push(projektiPaallikko);
          log.warn("Projektipäällikkö lisätty", { projektiPaallikko });
        }
        return projektiPaallikko;
      }
      log.warn("Projektipäällikköä ei löytynyt", { projektiPaallikko });
    } else {
      log.warn("Projektipäälliköllä ei ole sähköpostiosoitetta");
    }
  }

  addVarahenkiloFromEmail(email: string | null | undefined): void {
    if (email) {
      const kayttajas = this.kayttajas;
      const account: Kayttaja | undefined = kayttajas.findByEmail(email);
      if (account) {
        const newVarahenkilo = mergeKayttaja({ tyyppi: KayttajaTyyppi.VARAHENKILO, muokattavissa: false }, account);
        if (newVarahenkilo) {
          // Remove existing varahenkilo if it's different
          const currentVarahenkilo = this.users.filter((aUser) => aUser.tyyppi == KayttajaTyyppi.VARAHENKILO && !aUser.muokattavissa).pop();
          if (currentVarahenkilo?.email !== email) {
            remove(this.users, (aUser) => aUser == currentVarahenkilo);
            if (currentVarahenkilo && currentVarahenkilo.kayttajatunnus === this.kunnanEdustaja) {
              this.addOldProjektipaallikkoOrVarahenkiloAsRegularUser(currentVarahenkilo);
              log.warn("Vanha varahenkilö lisätty normaalikäyttäjäksi, koska hän on kunnan edustaja", { currentVarahenkilo });
            }
          }

          // Modify existing varahenkilo or replace old one
          const existingUserWithSameUid = this.users.filter((aUser) => aUser.kayttajatunnus == newVarahenkilo.kayttajatunnus).pop();
          if (existingUserWithSameUid) {
            existingUserWithSameUid.tyyppi = KayttajaTyyppi.VARAHENKILO;
            existingUserWithSameUid.muokattavissa = false;
          } else {
            this.users.push(newVarahenkilo);
          }
        }
      }
    }
  }

  private addOldProjektipaallikkoOrVarahenkiloAsRegularUser(user: DBVaylaUser): void {
    this.users.push({ ...user, muokattavissa: true, tyyppi: null });
  }

  addUser(partialUser: Partial<DBVaylaUser>): DBVaylaUser | undefined {
    const user = this.fillInUserInfoFromUserManagement({
      user: partialUser,
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
    } else if (user.email) {
      account = kayttajas.findByEmail(user.email);
    }
    if (account) {
      return mergeKayttaja({ ...user }, account);
    }
  }

  findUserByUid(uid: string): DBVaylaUser | undefined {
    return this.users.filter((aUser) => aUser.kayttajatunnus == uid).pop();
  }
}
