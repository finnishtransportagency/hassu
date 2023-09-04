import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import { IllegalArgumentError } from "../../../../src/error/IllegalArgumentError";
import * as sinon from "sinon";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../../common/graphql/apiModel";
import { Kielitiedot, Velho } from "../../../../src/database/model";
import MockDate from "mockdate";

const { expect } = require("chai");

describe("validateTallennaProjekti ('muokkaustila allows editing' validator)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);
  let user: NykyinenKayttaja;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

    fixture = new ProjektiFixture();
    user = UserFixture.mattiMeikalainen;
    userFixture.loginAs(UserFixture.mattiMeikalainen);
  });

  afterEach(() => {
    MockDate.reset();
    userFixture.logout();
    sinon.restore();
  });

  it("should NOT allow modifying nahtavillaolo if nahtavillaolo muokkausTila is LUKU", async () => {
    const projekti = fixture.dbProjekti2();
    MockDate.set("2022-06-06");
    projekti.nahtavillaoloVaiheJulkaisut = [
      {
        ...projekti.nahtavillaoloVaihe,
        velho: projekti.velho as Velho,
        kielitiedot: projekti.kielitiedot as Kielitiedot,
        yhteystiedot: [],
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        aineistoNahtavilla: [],
        hyvaksymisPaiva: "2022-06-06",
        id: 1,
      },
    ];

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            kategoriaId: "1",
            nimi: "Nimi",
            jarjestys: 1,
          },
        ],
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow modifying nahtavillaolo if nahtavillaolo muokkausTila is MUOKKAUS", async () => {
    const projekti = fixture.dbProjekti2();
    MockDate.set("2022-06-06");
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            kategoriaId: "1",
            nimi: "Nimi",
            jarjestys: 1,
          },
        ],
      },
    };
    await expect(await validateTallennaProjekti(projekti, input)).to.eql(undefined);
  });

  it("should allow modifying nahtavillaolo aineistoNahtavilla if nahtavillaolo muokkausTila is AINEISTO_MUOKKAUS", async () => {
    const projekti = fixture.dbProjekti2();
    MockDate.set("2022-06-06");
    projekti.nahtavillaoloVaiheJulkaisut = [
      {
        ...projekti.nahtavillaoloVaihe,
        velho: projekti.velho as Velho,
        kielitiedot: projekti.kielitiedot as Kielitiedot,
        yhteystiedot: [],
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        aineistoNahtavilla: [],
        hyvaksymisPaiva: "2022-06-06",
        id: 1,
      },
    ];
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 2,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-06-06",
      },
    };
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            kategoriaId: "1",
            nimi: "Nimi",
            jarjestys: 1,
          },
        ],
      },
    };
    await expect(await validateTallennaProjekti(projekti, input)).to.eql(undefined);
  });

  it("should NOT allow modifying nahtavillaolo kuulutusPaiva if nahtavillaolo muokkausTila is AINEISTO_MUOKKAUS", async () => {
    const projekti = fixture.dbProjekti2();
    MockDate.set("2022-06-06");
    projekti.nahtavillaoloVaiheJulkaisut = [
      {
        ...projekti.nahtavillaoloVaihe,
        velho: projekti.velho as Velho,
        kielitiedot: projekti.kielitiedot as Kielitiedot,
        yhteystiedot: [],
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        aineistoNahtavilla: [],
        hyvaksymisPaiva: "2022-06-06",
        id: 1,
      },
    ];
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 2,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-06-06",
      },
    };
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        kuulutusPaiva: "2022-12-12",
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
