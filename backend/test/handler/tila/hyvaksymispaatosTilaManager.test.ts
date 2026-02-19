import sinon, { SinonStub } from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { DBProjekti } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { hyvaksymisPaatosVaiheTilaManager } from "../../../src/handler/tila/hyvaksymisPaatosVaiheTilaManager";
import { LadattuTiedostoTila } from "hassu-common/graphql/apiModel";

import { expect } from "chai";
import { assertIsDefined } from "../../../src/util/assertions";
import { parameters } from "../../../src/aws/parameters";

describe("hyvaksymisPaatosTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  let saveProjekti: SinonStub;

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().dbProjektiKaikkiVaiheetSaame();
    delete projekti.jatkoPaatos1Vaihe;
    delete projekti.jatkoPaatos1VaiheJulkaisut;
    delete projekti.jatkoPaatos2Vaihe;
    delete projekti.jatkoPaatos2VaiheJulkaisut;
    userFixture.loginAs(UserFixture.hassuAdmin);
    sinon.stub(fileService, "deleteProjektiFilesRecursively");
    saveProjekti = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(projektiDatabase, "updateJulkaisuToList");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should remove saamePDFs from old kuulutus when making uudelleenkuulutus", async function () {
    projekti.hyvaksymisPaatosVaihe = {
      ...projekti.hyvaksymisPaatosVaihe,
      id: 1,
      hyvaksymisPaatosVaiheSaamePDFt: {
        POHJOISSAAME: {
          kuulutusPDF: {
            tiedosto: "/hyvaksymispaatos/1/kuulutus.pdf",
            nimi: "Saamenkielinen kuulutus",
            tuotu: "2023-01-01",
            tila: LadattuTiedostoTila.VALMIS,
            uuid: "99ed4b8b-6d9e-4b30-bedc-3949a8c0c16a",
          },
          kuulutusIlmoitusPDF: {
            tiedosto: "/hyvaksymispaatos/1/kuulutusilmoitus.pdf",
            nimi: "Saamenkielinen kuulutus ilmoitus",
            tuotu: "2023-01-01",
            tila: LadattuTiedostoTila.VALMIS,
            uuid: "bc798ba4-d2e9-4e62-873f-f35275203ad7",
          },
        },
      },
    };
    assertIsDefined(projekti.hyvaksymisPaatosVaiheJulkaisut);
    projekti.hyvaksymisPaatosVaiheJulkaisut = [
      {
        ...projekti.hyvaksymisPaatosVaiheJulkaisut?.[0],
        id: 1,
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: {
            kuulutusPDF: {
              tiedosto: "/hyvaksymispaatos/1/kuulutus.pdf",
              nimi: "Saamenkielinen kuulutus",
              tuotu: "2023-01-01",
              tila: LadattuTiedostoTila.VALMIS,
              uuid: "17e9b506-d058-43a2-b40b-6da3c83bc18a",
            },
            kuulutusIlmoitusPDF: {
              tiedosto: "/hyvaksymispaatos/1/kuulutusilmoitus.pdf",
              nimi: "Saamenkielinen kuulutus ilmoitus",
              tuotu: "2023-01-01",
              tila: LadattuTiedostoTila.VALMIS,
              uuid: "690c78fb-527a-4237-8108-397cf5538932",
            },
          },
        },
      },
    ];
    await hyvaksymisPaatosVaiheTilaManager.uudelleenkuuluta(projekti);
    const savedProjekti: Partial<DBProjekti> = saveProjekti.getCall(0).firstArg;
    expect(savedProjekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt).to.eql(undefined);
  });
});
