import { DBVaylaUser } from "../database/model";
import { Kayttaja, KayttajaTyyppi, ProjektiKayttajaInput } from "hassu-common/graphql/apiModel";
import { SearchMode } from "../personSearch/personSearchClient";
import { log } from "../logger";
import differenceWith from "lodash/differenceWith";
import remove from "lodash/remove";
import { mergeKayttaja } from "../personSearch/personAdapter";
import { Kayttajas } from "../personSearch/kayttajas";
import merge from "lodash/merge";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";
import { isAorLTunnus } from "hassu-common/util/isAorLTunnus";

type OptionalNullableString = string | null | undefined;

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
      const user = this.mergeInputUserAndCurrentUser(inputUser, currentUser);
      if (user) {
        resultingUsers.push(user);
      }
      return resultingUsers;
    }, []);
  }

  private mergeInputUserAndCurrentUser(inputUser: ProjektiKayttajaInput | undefined, currentUser: DBVaylaUser): DBVaylaUser | undefined {
    const inputMissingButUserRequired =
      !inputUser && (currentUser.muokattavissa === false || currentUser.kayttajatunnus === this.kunnanEdustaja);
    if (inputMissingButUserRequired) {
      return currentUser;
    } else if (!inputUser) {
      // Mark it for removal by returning undefined
      return undefined;
    }

    let user: DBVaylaUser | undefined = undefined;
    if (currentUser.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO) {
      user = this.mergeProjektiPaallikkoUser(currentUser, inputUser);
    } else if (currentUser.muokattavissa === false) {
      user = this.mergeNonEditableUser(currentUser, inputUser);
    } else {
      user = this.mergeEditableUser(inputUser, currentUser);
    }
    return user;
  }

  private mergeEditableUser(inputUser: ProjektiKayttajaInput, currentUser: DBVaylaUser) {
    if (inputUser.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO) {
      // Tyyppiä ei voi vaihtaa projektipäälliköksi
      delete inputUser.tyyppi;
    }
    if (!organisaatioIsEly(currentUser.organisaatio)) {
      // Käyttäjälle ei voi asettaa elyOrganisaatiota
      delete inputUser.elyOrganisaatio;
    }
    // Update rest of fields
    const user: DBVaylaUser = merge({}, currentUser, inputUser);
    return user;
  }

  private mergeProjektiPaallikkoUser(currentUser: DBVaylaUser, inputUser: ProjektiKayttajaInput) {
    const elyOrganisaatio: DBVaylaUser["elyOrganisaatio"] =
      organisaatioIsEly(currentUser.organisaatio) && inputUser.elyOrganisaatio ? inputUser.elyOrganisaatio : undefined;
    // Update only puhelinnumero if projektipaallikko
    const user: DBVaylaUser = {
      ...currentUser,
      elyOrganisaatio,
      yleinenYhteystieto: true,
      puhelinnumero: inputUser.puhelinnumero,
    };
    return user;
  }

  private mergeNonEditableUser(currentUser: DBVaylaUser, inputUser: ProjektiKayttajaInput) {
    // Update only puhelinnumero and yleinenYhteystieto if varahenkilö from Projektivelho
    const elyOrganisaatio: DBVaylaUser["elyOrganisaatio"] =
      organisaatioIsEly(currentUser.organisaatio) && inputUser.elyOrganisaatio ? inputUser.elyOrganisaatio : undefined;
    const user: DBVaylaUser = {
      ...currentUser,
      elyOrganisaatio,
      yleinenYhteystieto: !!inputUser.yleinenYhteystieto,
      puhelinnumero: inputUser.puhelinnumero,
    };
    return user;
  }

  private addNewUsers(changes: ProjektiKayttajaInput[], resultUsers: DBVaylaUser[]) {
    const newUsers = differenceWith(changes, resultUsers, (u1, u2) => u1.kayttajatunnus === u2.kayttajatunnus);
    newUsers.forEach((newUser) => {
      const userToAdd: Partial<DBVaylaUser> = {
        puhelinnumero: newUser.puhelinnumero,
        kayttajatunnus: newUser.kayttajatunnus,
        muokattavissa: true,
        tyyppi:
          isAorLTunnus(newUser.kayttajatunnus) && newUser.tyyppi === KayttajaTyyppi.VARAHENKILO ? KayttajaTyyppi.VARAHENKILO : undefined,
        yleinenYhteystieto: newUser.yleinenYhteystieto ?? undefined,
        elyOrganisaatio: newUser.elyOrganisaatio ?? undefined,
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

  addProjektiPaallikkoFromEmail(email: OptionalNullableString): DBVaylaUser | undefined {
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

  private createNewVelhoHenkiloFromByEmail(email: OptionalNullableString): DBVaylaUser | undefined {
    const account = email ? this.kayttajas.findByEmail(email) : undefined;
    return account
      ? mergeKayttaja({ tyyppi: isAorLTunnus(account.uid) ? KayttajaTyyppi.VARAHENKILO : null, muokattavissa: false }, account)
      : undefined;
  }

  addVarahenkiloFromEmail(email: OptionalNullableString): void {
    const newVelhohenkilo = this.createNewVelhoHenkiloFromByEmail(email);
    if (!email || !newVelhohenkilo) {
      return;
    }
    if (newVelhohenkilo.tyyppi === KayttajaTyyppi.VARAHENKILO) {
      this.removeCurrentVelhoVarahenkilo(email);
    }
    // Modify existing velhohenkilo or replace old one
    const existingUserWithSameUid = this.users.filter((aUser) => aUser.kayttajatunnus == newVelhohenkilo.kayttajatunnus).pop();
    if (existingUserWithSameUid) {
      existingUserWithSameUid.tyyppi = newVelhohenkilo.tyyppi;
      existingUserWithSameUid.muokattavissa = false;
    } else {
      this.users.push(newVelhohenkilo);
    }
  }

  private removeCurrentVelhoVarahenkilo(newEmail: string) {
    // Remove existing varahenkilo if it's different
    const currentVarahenkilo = this.users.filter((aUser) => aUser.tyyppi == KayttajaTyyppi.VARAHENKILO && !aUser.muokattavissa).pop();
    if (currentVarahenkilo?.email !== newEmail) {
      remove(this.users, (aUser) => aUser == currentVarahenkilo);
      if (currentVarahenkilo && currentVarahenkilo.kayttajatunnus === this.kunnanEdustaja) {
        this.addOldProjektipaallikkoOrVarahenkiloAsRegularUser(currentVarahenkilo);
        log.warn("Vanha varahenkilö lisätty normaalikäyttäjäksi, koska hän on kunnan edustaja", { currentVarahenkilo });
      }
    }
  }

  resetHenkilot(resetAll: boolean, vastuuhenkilonEmail: string | null | undefined, varahenkilonEmail: string | null | undefined): void {
    const oldKunnanedustaja = this.users.filter((dbvayluser) => dbvayluser.kayttajatunnus === this.kunnanEdustaja).pop();
    if (resetAll) {
      // Poista kaikki muut paitsi tuleva projektipäällikkö ja vastuuhenkilö
      remove(this.users, (user) => user.email !== vastuuhenkilonEmail && user.email !== varahenkilonEmail);
    } else {
      // Poista kaikki muut velhosta tulleet henkilot, paitsi tuleva pp ja lisähenkilö (ei aina varahenkilökelpoinen)
      remove(this.users, (user) => !user.muokattavissa && user.email !== vastuuhenkilonEmail && user.email !== varahenkilonEmail);
    }
    // tarkista että kunnanedustaja on vielä olemassa tai lisää takaisin
    if (oldKunnanedustaja) {
      const newKunnanedustaja = this.users.filter((dbvayluser) => dbvayluser.kayttajatunnus === this.kunnanEdustaja).pop();
      if (!newKunnanedustaja) {
        this.addOldProjektipaallikkoOrVarahenkiloAsRegularUser(oldKunnanedustaja);
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
