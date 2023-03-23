import { Status } from "../../../../common/graphql/apiModel";
import { ProjektiFixture } from "../../../test/fixture/projektiFixture";
import { deleteProjekti } from "./tests";
import { addLogoFilesToProjekti } from "./util";
import { DBProjekti } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";

export async function createSaameProjektiToVaihe(vaihe: Status): Promise<DBProjekti> {
  const dbProjekti = new ProjektiFixture().dbProjektiHyvaksymisMenettelyssaSaame();
  if (vaihe == Status.ALOITUSKUULUTUS) {
    delete dbProjekti.aloitusKuulutusJulkaisut;
    delete dbProjekti.vuorovaikutusKierros;
  }
  delete dbProjekti.vuorovaikutusKierrosJulkaisut;
  delete dbProjekti.hyvaksymisPaatosVaihe;
  delete dbProjekti.hyvaksymisPaatosVaiheJulkaisut;
  delete dbProjekti.jatkoPaatos1Vaihe;
  delete dbProjekti.jatkoPaatos1VaiheJulkaisut;
  delete dbProjekti.jatkoPaatos2Vaihe;
  delete dbProjekti.jatkoPaatos2VaiheJulkaisut;

  const oid = dbProjekti.oid;
  await deleteProjekti(oid);
  await addLogoFilesToProjekti(oid);
  await projektiDatabase.createProjekti(dbProjekti);

  return dbProjekti;
}
