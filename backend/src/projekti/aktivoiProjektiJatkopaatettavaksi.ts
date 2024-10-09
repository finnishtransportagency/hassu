import { IllegalProjektiStateError } from "hassu-common/error";
import {
  AktivoiProjektiJatkopaatettavaksiMutationVariables as Variables,
  JatkopaatettavaVaihe,
  Status,
} from "hassu-common/graphql/apiModel";
import { KasittelynTila } from "../database/model";
import { projektiDatabase } from "../database/projektiDatabase";
import { requireAdmin } from "../user/userService";
import { assertIsDefined } from "../util/assertions";
import { synchronizeUpdatesFromVelho } from "./projektiHandler";
import GetProjektiStatus from "./status/getProjektiStatus";

export async function aktivoiProjektiJatkopaatettavaksi(vars: Variables): Promise<string> {
  await validate(vars);
  const mapVaiheToKasittelynTilaKey: Record<
    JatkopaatettavaVaihe,
    keyof Pick<KasittelynTila, "ensimmainenJatkopaatos" | "toinenJatkopaatos">
  > = {
    JATKOPAATOS_1: "ensimmainenJatkopaatos",
    JATKOPAATOS_2: "toinenJatkopaatos",
  };
  await projektiDatabase.aktivoiProjektiJatkopaatettavaksi(vars.oid, vars.versio, mapVaiheToKasittelynTilaKey[vars.vaihe], {
    aktiivinen: true,
    asianumero: vars.paatoksenTiedot.asianumero ?? undefined,
    paatoksenPvm: vars.paatoksenTiedot.paatoksenPvm ?? undefined,
  });
  await synchronizeUpdatesFromVelho(vars.oid, true);
  return vars.oid;
}

const mapVaiheToExpectedStatus: Record<JatkopaatettavaVaihe, Status> = {
  JATKOPAATOS_1: Status.EPAAKTIIVINEN_1,
  JATKOPAATOS_2: Status.EPAAKTIIVINEN_2,
};

async function validate(vars: Variables) {
  requireAdmin();
  const projekti = await projektiDatabase.loadProjektiByOid(vars.oid);
  assertIsDefined(projekti);
  const status = await GetProjektiStatus.getProjektiStatus(projekti);
  const expectedStatus = mapVaiheToExpectedStatus[vars.vaihe];

  if (status !== expectedStatus) {
    throw new IllegalProjektiStateError(
      `Projekti tila ei ole sopiva projektin avaamiseksi jatkopäätettäväksi. Tila: '${status}', Odotettu tila: '${expectedStatus}'`
    );
  }
}
