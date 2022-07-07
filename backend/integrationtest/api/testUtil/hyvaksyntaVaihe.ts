import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./tests";
import { Status } from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";

export async function testHyvaksyntaVaiheHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti.nahtavillaoloVaiheJulkaisut[0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-06-08";
  await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(dbProjekti, julkaisu);

  await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA); // Verify status in yllapito

  // Verify status in public
  userFixture.logout();
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expect(publicProjekti.nahtavillaoloVaihe).not.to.be.undefined;
  expect(publicProjekti.nahtavillaoloVaihe.aineistoNahtavilla).to.be.undefined;
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}
