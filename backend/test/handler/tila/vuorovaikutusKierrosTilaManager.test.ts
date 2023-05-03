/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { DBProjekti } from "../../../src/database/model";
//import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { KuulutusJulkaisuTila, VuorovaikutusKierrosTila, VuorovaikutusTilaisuusTyyppi } from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { S3Mock } from "../../aws/awsMock";
import { vuorovaikutusKierrosTilaManager } from "../../../src/handler/tila/vuorovaikutusKierrosTilaManager";
import { assertIsDefined } from "../../../src/util/assertions";
import { nyt } from "../../../src/util/dateUtil";

const { expect } = require("chai");

describe("vuorovaikutusKierrosTilaManager", () => {
  //let saveProjektiStub: sinon.SinonStub;
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();

  before(() => {
    //saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().nahtavillaoloVaihe();
    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    sinon.reset();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should reject luoUusiKierros if vuorovaikutusKierros is still unpublished", async function () {
    delete projekti.nahtavillaoloVaiheJulkaisut;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    expect(() => vuorovaikutusKierrosTilaManager.validateLisaaKierros(projekti)).to.throw(
      "Et voi luoda uutta vuorovaikutuskierrosta, koska viimeisin vuorovaikutuskierros on vielä julkaisematta"
    );
  });

  it("should reject luoUusiKierros if there is a nahtavillaolovaihe waiting for approval", async function () {
    assertIsDefined(projekti.nahtavillaoloVaiheJulkaisut);
    projekti.nahtavillaoloVaiheJulkaisut = [
      { ...projekti.nahtavillaoloVaiheJulkaisut[0], id: 0, tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA, hyvaksyja: undefined },
    ];
    expect(() => vuorovaikutusKierrosTilaManager.validateLisaaKierros(projekti)).to.throw(
      "Et voi luoda uutta vuorovaikutuskierrosta, koska viimeisin julkaistu vuorovaikutus ei ole vielä päättynyt, tai koska ollaan jo nähtävilläolovaiheessa"
    );
  });

  it("should reject luoUusiKierros if there is a nahtavillaoloVaiheJulkaisu", async function () {
    expect(() => vuorovaikutusKierrosTilaManager.validateLisaaKierros(projekti)).to.throw(
      "Et voi luoda uutta vuorovaikutuskierrosta, koska viimeisin julkaistu vuorovaikutus ei ole vielä päättynyt, tai koska ollaan jo nähtävilläolovaiheessa"
    );
  });

  it("should reject lisaaUusiKierros if there are still unpublished vuorovaikutustilaisuus", async function () {
    delete projekti.nahtavillaoloVaiheJulkaisut;
    projekti.vuorovaikutusKierrosJulkaisut = [
      {
        ...projekti.vuorovaikutusKierrosJulkaisut?.[projekti.vuorovaikutusKierrosJulkaisut?.length - 1],
        id: 0,
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
            paivamaara: nyt().add(1, "day").toString(), // one day in future
            alkamisAika: "10:00",
            paattymisAika: "11:00",
            linkki: "http://www.fi",
          },
        ],
      },
    ];
    await expect(() => vuorovaikutusKierrosTilaManager.validateLisaaKierros(projekti)).to.throw(
      "Et voi luoda uutta vuorovaikutuskierrosta, koska viimeisin julkaistu vuorovaikutus ei ole vielä päättynyt, tai koska ollaan jo nähtävilläolovaiheessa"
    );
  });
});
