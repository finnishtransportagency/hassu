import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import { IllegalArgumentError } from "hassu-common/error";
import * as sinon from "sinon";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { AineistoTila, KuulutusJulkaisuTila, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { Kielitiedot, Velho } from "../../../../src/database/model";
import MockDate from "mockdate";

import { expect } from "chai";
import { parameters } from "../../../../src/aws/parameters";

describe("validateTallennaProjekti ('muokkaustila allows editing' validator)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));

    fixture = new ProjektiFixture();
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
        projektiOid: projekti.oid,
        velho: projekti.velho as Velho,
        kielitiedot: projekti.kielitiedot as Kielitiedot,
        yhteystiedot: [],
        kuulutusYhteystiedot: projekti.nahtavillaoloVaihe?.kuulutusYhteystiedot || {},
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        aineistoNahtavilla: [],
        hyvaksymisPaiva: "2022-06-06",
        id: 1,
      },
    ];

    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            kategoriaId: "1",
            nimi: "Nimi",
            jarjestys: 1,
            tila: AineistoTila.ODOTTAA_TUONTIA,
            uuid: "4ce5e5bf-bcf5-4e0b-a194-d1d952d21b66",
          },
        ],
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow modifying nahtavillaolo if nahtavillaolo muokkausTila is MUOKKAUS", async () => {
    const projekti = fixture.dbProjekti2();
    MockDate.set("2022-06-06");
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            kategoriaId: "1",
            nimi: "Nimi",
            jarjestys: 1,
            tila: AineistoTila.ODOTTAA_TUONTIA,
            uuid: "420c5a1d-7d9b-4f3b-9e10-306b00c5c647",
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
        projektiOid: projekti.oid,
        velho: projekti.velho as Velho,
        kielitiedot: projekti.kielitiedot as Kielitiedot,
        yhteystiedot: [],
        kuulutusYhteystiedot: projekti.nahtavillaoloVaihe?.kuulutusYhteystiedot || {},
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
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            kategoriaId: "1",
            nimi: "Nimi",
            jarjestys: 1,
            tila: AineistoTila.ODOTTAA_TUONTIA,
            uuid: "863ecd5c-f4af-4659-b125-62d051eaf0a2",
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
        projektiOid: projekti.oid,
        velho: projekti.velho as Velho,
        kielitiedot: projekti.kielitiedot as Kielitiedot,
        yhteystiedot: [],
        kuulutusYhteystiedot: projekti.nahtavillaoloVaihe?.kuulutusYhteystiedot || {},
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
