import { Status } from "../../../../common/graphql/apiModel";
import { ProjektiFixture } from "../../../test/fixture/projektiFixture";
import { deleteProjekti } from "./tests";
import { addLogoFilesToProjekti } from "./util";
import { DBProjekti } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";

function deleteParts(dbProjekti: DBProjekti, vaihe: Status) {
  delete dbProjekti.jatkoPaatos2VaiheJulkaisut;
  if (vaihe == Status.JATKOPAATOS_2) {
    return;
  }
  delete dbProjekti.jatkoPaatos2Vaihe;
  delete dbProjekti.jatkoPaatos1VaiheJulkaisut;
  if (vaihe == Status.JATKOPAATOS_1) {
    return;
  }
  delete dbProjekti.hyvaksymisPaatosVaiheJulkaisut;
  delete dbProjekti.jatkoPaatos1Vaihe;
  if (vaihe == Status.HYVAKSYMISMENETTELYSSA) {
    return;
  }
  delete dbProjekti.hyvaksymisPaatosVaihe;
  delete dbProjekti.nahtavillaoloVaiheJulkaisut;
  if (vaihe == Status.NAHTAVILLAOLO) {
    return;
  }
  delete dbProjekti.nahtavillaoloVaihe;
  delete dbProjekti.vuorovaikutusKierrosJulkaisut;
  if (vaihe == Status.SUUNNITTELU) {
    return;
  }
  delete dbProjekti.vuorovaikutusKierros;
  delete dbProjekti.aloitusKuulutusJulkaisut;
}

export async function createSaameProjektiToVaihe(vaihe: Status): Promise<DBProjekti> {
  const dbProjekti = new ProjektiFixture().dbProjektiKaikkiVaiheetSaame();
  deleteParts(dbProjekti, vaihe);

  const oid = dbProjekti.oid;
  await deleteProjekti(oid);
  await addLogoFilesToProjekti(oid);
  await projektiDatabase.createProjekti(dbProjekti);

  return dbProjekti;
}
