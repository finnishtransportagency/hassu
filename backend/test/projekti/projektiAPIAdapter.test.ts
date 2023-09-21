import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { UserFixture } from "../fixture/userFixture";
import { AloitusKuulutus, DBProjekti, HyvaksymisPaatosVaihe, NahtavillaoloVaihe, VuorovaikutusKierros } from "../../src/database/model";
import { loadProjektiYllapito } from "../../src/projekti/projektiHandler";
import { userService } from "../../src/user";
import { Kieli, Projekti, VuorovaikutusTilaisuusTyyppi } from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../src/util/assertions";

import { expect } from "chai";

describe("projektiHandler", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);
  let loadProjektiByOid: sinon.SinonStub;
  let projekti: DBProjekti;
  beforeEach(() => {
    fixture = new ProjektiFixture();
    loadProjektiByOid = sinon.stub(projektiDatabase, "loadProjektiByOid");
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("loadProjekti should filter out references to removed users from aloituskuulutus", async () => {
    projekti = fixture.dbProjekti1();
    const aloituskuulutus: AloitusKuulutus = {
      ...projekti.aloitusKuulutus,
      id: 123,
      kuulutusYhteystiedot: {
        yhteysTiedot: projekti.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot,
        yhteysHenkilot: ["ABC1233"], // lisätään olematon yhteyshenkilö - kuvitteellisesti tämä on ollut kunnan edustaja, joka on vaihdettu toiseen ja poistettu
      },
    };
    projekti = {
      ...projekti,
      aloitusKuulutus: aloituskuulutus,
    };
    loadProjektiByOid.resolves(projekti);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const adaptoituProjekti: Projekti = (await loadProjektiYllapito(projekti.oid)) as Projekti;
    expect(adaptoituProjekti.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysHenkilot?.length).to.eql(0);
  });

  it("loadProjekti should filter out references to removed users from vuorovaikutusKierros's esitettavatYhteystiedot", async () => {
    projekti = fixture.dbProjekti4();
    assertIsDefined(projekti.vuorovaikutusKierros);
    const vuorovaikutusKierros: VuorovaikutusKierros = {
      ...projekti.vuorovaikutusKierros,
      esitettavatYhteystiedot: {
        yhteysTiedot: projekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysTiedot,
        yhteysHenkilot: [...(projekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysHenkilot as string[]), "ABC1233"], // lisätään olematon yhteyshenkilö - kuvitteellisesti tämä on ollut kunnan edustaja, joka on vaihdettu toiseen ja poistettu
      }, // yhteyshenkilöitä on yksi validi
    };
    projekti = {
      ...projekti,
      vuorovaikutusKierros,
    };
    loadProjektiByOid.resolves(projekti);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const adaptoituProjekti: Projekti = (await loadProjektiYllapito(projekti.oid)) as Projekti;
    expect(adaptoituProjekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysHenkilot?.length).to.eql(1);
  });

  it("loadProjekti should filter out references to removed users from vuorovaikutusKierros's vuorovaikutusTilaisuudet", async () => {
    projekti = fixture.dbProjekti4();
    assertIsDefined(projekti.vuorovaikutusKierros);
    const vuorovaikutusKierros: VuorovaikutusKierros = {
      ...projekti.vuorovaikutusKierros,
      vuorovaikutusTilaisuudet: [
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          nimi: { [Kieli.SUOMI]: "Lorem ipsum" },
          paivamaara: "2022-03-04",
          alkamisAika: "15:00",
          paattymisAika: "16:00",
          esitettavatYhteystiedot: {
            yhteysHenkilot: [projekti.kayttoOikeudet[0].kayttajatunnus, "ABC1233"], // lisätään olematon yhteyshenkilö - kuvitteellisesti tämä on ollut kunnan edustaja, joka on vaihdettu toiseen ja poistettu
          },
        },
      ],
    };
    projekti = {
      ...projekti,
      vuorovaikutusKierros,
    };
    loadProjektiByOid.resolves(projekti);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const adaptoituProjekti: Projekti = (await loadProjektiYllapito(projekti.oid)) as Projekti;
    expect(adaptoituProjekti.vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.[0].esitettavatYhteystiedot?.yhteysHenkilot?.length).to.eql(1);
  });

  it("loadProjekti should filter out references to removed users from nähtävilläolovaihe", async () => {
    projekti = fixture.dbProjekti4();
    assertIsDefined(projekti.nahtavillaoloVaihe);
    const nahtavillaoloVaihe: NahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      kuulutusYhteystiedot: {
        yhteysTiedot: projekti.nahtavillaoloVaihe?.kuulutusYhteystiedot?.yhteysTiedot,
        yhteysHenkilot: [...(projekti.nahtavillaoloVaihe?.kuulutusYhteystiedot?.yhteysHenkilot as string[]), "ABC1233"], // lisätään olematon yhteyshenkilö - kuvitteellisesti tämä on ollut kunnan edustaja, joka on vaihdettu toiseen ja poistettu
      }, // kaksi validia yhteyshenkilöä
    };
    projekti = {
      ...projekti,
      nahtavillaoloVaihe,
    };
    loadProjektiByOid.resolves(projekti);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const adaptoituProjekti: Projekti = (await loadProjektiYllapito(projekti.oid)) as Projekti;
    expect(adaptoituProjekti.nahtavillaoloVaihe?.kuulutusYhteystiedot?.yhteysHenkilot?.length).to.eql(2);
  });

  it("loadProjekti should filter out references to removed users from hyvaäksymispäätösVaihe", async () => {
    projekti = fixture.dbProjekti2();
    assertIsDefined(projekti.hyvaksymisPaatosVaihe);
    const hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe = {
      ...projekti.hyvaksymisPaatosVaihe,
      kuulutusYhteystiedot: {
        yhteysTiedot: projekti.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysTiedot,
        yhteysHenkilot: [...(projekti.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysHenkilot as string[]), "ABC1233"], // lisätään olematon yhteyshenkilö - kuvitteellisesti tämä on ollut kunnan edustaja, joka on vaihdettu toiseen ja poistettu
      }, // kaksi validia yhteyshenkilöä
    };
    projekti = {
      ...projekti,
      hyvaksymisPaatosVaihe,
    };
    loadProjektiByOid.resolves(projekti);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const adaptoituProjekti: Projekti = (await loadProjektiYllapito(projekti.oid)) as Projekti;
    expect(adaptoituProjekti.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysHenkilot?.length).to.eql(2);
  });
});
