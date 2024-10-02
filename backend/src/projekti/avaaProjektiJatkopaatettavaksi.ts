import { IllegalProjektiStateError } from "hassu-common/error";
import { AvaaProjektiJatkopaatettavaksiMutationVariables as Variables, JatkopaatettavaVaihe, Status } from "hassu-common/graphql/apiModel";
import { KasittelynTila } from "../database/model";
import { projektiDatabase } from "../database/projektiDatabase";
import { assertIsDefined } from "../util/assertions";
import { synchronizeUpdatesFromVelho } from "./projektiHandler";
import GetProjektiStatus from "./status/getProjektiStatus";

export async function avaaProjektiJatkopaatettavaksi(vars: Variables): Promise<string> {
  validateProjektiStatus(vars);
  const mapVaiheToKasittelynTilaKey: Record<
    JatkopaatettavaVaihe,
    keyof Pick<KasittelynTila, "ensimmainenJatkopaatos" | "toinenJatkopaatos">
  > = {
    JATKOPAATOS_1: "ensimmainenJatkopaatos",
    JATKOPAATOS_2: "toinenJatkopaatos",
  };
  await projektiDatabase.avaaProjektiJatkopaatettavaksi(vars.oid, mapVaiheToKasittelynTilaKey[vars.vaihe]);
  await synchronizeUpdatesFromVelho(vars.oid, true);
  return vars.oid;
}

async function validateProjektiStatus(vars: Variables) {
  const projekti = await projektiDatabase.loadProjektiByOid(vars.oid);
  assertIsDefined(projekti);
  const status = await GetProjektiStatus.getProjektiStatus(projekti);
  const mapVaiheToExpectedStatus: Record<JatkopaatettavaVaihe, Status> = {
    JATKOPAATOS_1: Status.EPAAKTIIVINEN_1,
    JATKOPAATOS_2: Status.EPAAKTIIVINEN_2,
  };
  const expectedStatus = mapVaiheToExpectedStatus[vars.vaihe];

  if (status !== expectedStatus) {
    throw new IllegalProjektiStateError(
      `Projekti tila ei ole sopiva projektin avaamiseksi jatkopäätettäväksi. Tila: '${status}', Odotettu tila: '${expectedStatus}'`
    );
  }
}
