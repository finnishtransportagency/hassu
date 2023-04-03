import { Status } from "../../../../common/graphql/apiModel";
import { ProjektiFixture } from "../../../test/fixture/projektiFixture";
import { deleteProjekti } from "./tests";
import { addLogoFilesToProjekti } from "./util";
import { DBProjekti } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { assertIsDefined } from "../../../src/util/assertions";

function deleteParts(dbProjekti: DBProjekti, vaihe: Status) {
  delete dbProjekti.jatkoPaatos2VaiheJulkaisut;
  if (vaihe == Status.JATKOPAATOS_2) {
    assertIsDefined(dbProjekti.jatkoPaatos2Vaihe);
    dbProjekti.jatkoPaatos2Vaihe.kuulutusVaihePaattyyPaiva = "2040-01-01";
    assertIsDefined(dbProjekti.jatkoPaatos1Vaihe);
    dbProjekti.jatkoPaatos1Vaihe.kuulutusVaihePaattyyPaiva = "2020-01-01";
    return;
  }
  delete dbProjekti.jatkoPaatos2Vaihe;
  delete dbProjekti.jatkoPaatos1VaiheJulkaisut;
  delete dbProjekti.kasittelynTila?.toinenJatkopaatos;
  if (vaihe == Status.JATKOPAATOS_1) {
    assertIsDefined(dbProjekti.jatkoPaatos1Vaihe);
    dbProjekti.jatkoPaatos1Vaihe.kuulutusVaihePaattyyPaiva = "2040-01-01";
    return;
  }
  delete dbProjekti.hyvaksymisPaatosVaiheJulkaisut;
  delete dbProjekti.jatkoPaatos1Vaihe;
  delete dbProjekti.kasittelynTila?.ensimmainenJatkopaatos;
  if (vaihe == Status.HYVAKSYMISMENETTELYSSA) {
    assertIsDefined(dbProjekti.hyvaksymisPaatosVaihe);
    dbProjekti.hyvaksymisPaatosVaihe.kuulutusVaihePaattyyPaiva = "2040-01-01";
    return;
  }
  delete dbProjekti.hyvaksymisPaatosVaihe;
  delete dbProjekti.nahtavillaoloVaiheJulkaisut;
  delete dbProjekti.kasittelynTila?.hyvaksymispaatos;
  if (vaihe == Status.NAHTAVILLAOLO) {
    assertIsDefined(dbProjekti.nahtavillaoloVaihe);
    dbProjekti.nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva = "2040-01-01";
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
