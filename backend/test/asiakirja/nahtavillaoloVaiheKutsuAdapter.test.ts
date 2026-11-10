// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import * as sinon from "sinon";
import { Kieli, LaskuriTyyppi, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { NahtavillaoloVaiheKutsuAdapter } from "../../src/asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import { pickCommonAdapterProps } from "../../src/asiakirja/adapter/commonKutsuAdapter";
import { mockBankHolidays, mockParameters } from "../mocks";
import { mockUUID } from "../../integrationtest/shared/sharedMock";
import { mockKirjaamoOsoitteet } from "./asiakirjaTestUtil";
import { calculateEndDate } from "../../src/endDateCalculator/endDateCalculatorHandler";
import { assertIsDefined } from "../../src/util/assertions";

describe("NahtavillaoloVaiheKutsuAdapter", () => {
  const projektiFixture = new ProjektiFixture();
  mockKirjaamoOsoitteet();
  mockBankHolidays();
  mockUUID();
  mockParameters();

  afterEach(() => sinon.reset());
  after(() => sinon.restore());

  async function createAdapter(kieli: Kieli, tyyppi: ProjektiTyyppi) {
    const projekti = projektiFixture.dbProjekti2();
    assertIsDefined(projekti.velho);
    assertIsDefined(projekti.nahtavillaoloVaihe);
    projekti.velho.tyyppi = tyyppi;
    projekti.velho.vaylamuoto = ["tie"];
    projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY;

    const julkaisu = await asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu({ ...projekti, nahtavillaoloVaihe: projekti.nahtavillaoloVaihe });
    assertIsDefined(julkaisu.kuulutusPaiva);
    assertIsDefined(julkaisu.hankkeenKuvaus);

    return new NahtavillaoloVaiheKutsuAdapter({
      ...(await pickCommonAdapterProps(projekti, julkaisu.hankkeenKuvaus, kieli)),
      ...julkaisu,
      kuulutettuYhdessaSuunnitelmanimi: undefined,
      kuulutusPaiva: julkaisu.kuulutusPaiva,
      kuulutusVaihePaattyyPaiva: await calculateEndDate({
        alkupaiva: julkaisu.kuulutusPaiva,
        tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
      }),
      kirjaamoOsoitteet: [],
    });
  }

  describe("userInterfaceFields.infoTekstit", () => {
    it("toiminnallinen käyttää mielipide-tekstiä", async () => {
      const adapter = await createAdapter(Kieli.SUOMI, ProjektiTyyppi.TOIMINNALLINEN);
      const { infoTekstit } = adapter.userInterfaceFields;

      expect(infoTekstit).to.have.length(1);
      expect(infoTekstit![0]).to.include("mielipiteensä");
      expect(infoTekstit![0]).to.not.include("muistutus");
      expect(infoTekstit![0]).to.not.include("{{");
    });

    it("TIE-tyyppi käyttää muistutus-tekstiä", async () => {
      const adapter = await createAdapter(Kieli.SUOMI, ProjektiTyyppi.TIE);
      const { infoTekstit } = adapter.userInterfaceFields;

      expect(infoTekstit).to.have.length(1);
      expect(infoTekstit![0]).to.include("muistutus");
      expect(infoTekstit![0]).to.not.include("mielipiteensä");
      expect(infoTekstit![0]).to.not.include("{{");
    });
  });
});
