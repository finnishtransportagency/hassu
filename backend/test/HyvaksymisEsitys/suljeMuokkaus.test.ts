import sinon from "sinon";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, DBVaylaUser } from "../../src/database/model";
import { suljeMuokkaus } from "../../src/HyvaksymisEsitys/suljeMuokkaus";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { fileService } from "../../src/files/fileService";
import { expect } from "chai";
import { IllegalAccessError } from "hassu-common/error";

describe("Hyväksymisesityksen suljeMuokkaus", () => {
  it("poistaa oikeat tiedostot", async () => {
    const userFixture = new UserFixture(userService);
    userFixture.loginAsAdmin();
    const deleteFiles = sinon.stub(fileService, "deleteFilesRecursively");
    await suljeMuokkaus({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: null }, {
      oid: "1",
      versio: 2,
      muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
      julkaistuHyvaksymisEsitys: {},
    } as DBProjekti);
    expect(deleteFiles.calledOnce).to.be.true;
    expect(deleteFiles.firstCall.args).to.eql(["hassu-localstack-yllapito", "yllapito/tiedostot/projekti/1/muokattava_hyvaksymisesitys"]);
  });

  it("onnistuu projektipäälliköltä", async () => {
    const userFixture = new UserFixture(userService);
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    userFixture.loginAs(projari);
    sinon.stub(fileService, "deleteFilesRecursively");
    const kutsu = suljeMuokkaus({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: null }, {
      oid: "1",
      versio: 2,
      muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
      julkaistuHyvaksymisEsitys: {},
      kayttoOikeudet: [projariAsVaylaDBUser],
    } as DBProjekti);
    await expect(kutsu).to.eventually.to.be.fulfilled;
  });

  it("ei onnistu projektikayttajalta", async () => {
    const userFixture = new UserFixture(userService);
    const projari = UserFixture.pekkaProjari;
    const projariAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: projari.uid!,
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    };
    const muokkaaja = UserFixture.manuMuokkaaja;
    const muokkaajaAsVaylaDBUser: Partial<DBVaylaUser> = {
      kayttajatunnus: muokkaaja.uid!,
    };
    userFixture.loginAs(muokkaaja);
    sinon.stub(fileService, "deleteFilesRecursively");
    const kutsu = suljeMuokkaus({ oid: "1", versio: 2, muokattavaHyvaksymisEsitys: null }, {
      oid: "1",
      versio: 2,
      muokattavaHyvaksymisEsitys: { tila: API.HyvaksymisTila.MUOKKAUS },
      julkaistuHyvaksymisEsitys: {},
      kayttoOikeudet: [projariAsVaylaDBUser, muokkaajaAsVaylaDBUser],
    } as DBProjekti);
    await expect(kutsu).to.eventually.be.rejectedWith(IllegalAccessError);
  });

  // TODO: "poistaa muokkaustilaisen hyväksymisesityksen", eli testataan että projektiDatabase.saveProjekti kutsuu oikeaa asiaa
  // TODO: "ei onnistu, jos ei ole muokkaustilaista hyväksymisesitystä"
  // TODO: "ei onnistu, jos on muokkaustilainen hyväksymisesitys, mutta ei ole julkaistua hyväksymisesitystä"
  // TODO: "ei onnistu, jos ei ole muokkaustilaista eikä julkaistua hyväksymisesitystä"
});
