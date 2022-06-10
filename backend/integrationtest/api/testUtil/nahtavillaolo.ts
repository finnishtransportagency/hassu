import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import { Status } from "../../../../common/graphql/apiModel";
import { expectToMatchSnapshot } from "./util";
import { loadProjektiFromDatabase } from "./tests";

export async function testNahtavillaOlo(oid: string, projektiPaallikko: string): Promise<void> {
  await api.tallennaProjekti({
    oid,
    nahtavillaoloVaihe: apiTestFixture.nahtavillaoloVaihe([projektiPaallikko]),
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloPerustiedot", projekti.nahtavillaoloVaihe);
}
