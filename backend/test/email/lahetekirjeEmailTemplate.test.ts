// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import * as sinon from "sinon";
import { Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { createNahtavillaLahetekirjeEmail } from "../../src/email/lahetekirje/lahetekirjeEmailTemplate";
import { NahtavillaoloVaiheKutsuAdapter } from "../../src/asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import { pickCommonAdapterProps } from "../../src/asiakirja/adapter/commonKutsuAdapter";
import { mockBankHolidays, mockParameters } from "../mocks";
import { mockUUID } from "../../integrationtest/shared/sharedMock";
import { mockKirjaamoOsoitteet } from "../asiakirja/asiakirjaTestUtil";
import { LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { calculateEndDate } from "../../src/endDateCalculator/endDateCalculatorHandler";
import { assertIsDefined } from "../../src/util/assertions";

describe("lahetekirjeEmailTemplate", () => {
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

  it("nahtavillaolo lahetekirje: toiminnallinen käyttää toiminnallinen-tekstejä eikä yleistä suunnitelmaa", async () => {
    const adapter = await createAdapter(Kieli.SUOMI, ProjektiTyyppi.TOIMINNALLINEN);
    const email = createNahtavillaLahetekirjeEmail(adapter);

    expect(email.text).to.include("toiminnallisen luokan");
    expect(email.text).to.not.include("{{");
  });

  it("nahtavillaolo lahetekirje: toiminnallinen ruotsiksi käyttää toiminnallinen-tekstejä", async () => {
    const adapter = await createAdapter(Kieli.RUOTSI, ProjektiTyyppi.TOIMINNALLINEN);
    const email = createNahtavillaLahetekirjeEmail(adapter);

    expect(email.text).to.include("funktionella klass");
    expect(email.text).to.not.include("{{");
  });

  it("nahtavillaolo lahetekirje: TIE-tyyppi käyttää normaalia suunnitelmatekstiä", async () => {
    const adapter = await createAdapter(Kieli.SUOMI, ProjektiTyyppi.TIE);
    const email = createNahtavillaLahetekirjeEmail(adapter);

    expect(email.text).to.not.include("toiminnallisen luokan");
    expect(email.text).to.not.include("{{");
  });
});
