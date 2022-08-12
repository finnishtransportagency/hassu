import { HyvaksymisPaatosVaiheTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import { DBProjekti, HyvaksymisPaatosVaihe } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";

function getHyvaksymisPaatosVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
  const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
  if (!hyvaksymisPaatosVaihe) {
    throw new Error("Projektilla ei ole hyvaksymisPaatosVaihetta");
  }
  return hyvaksymisPaatosVaihe;
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe) {
  if (hyvaksymisPaatosVaihe.palautusSyy) {
    hyvaksymisPaatosVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, hyvaksymisPaatosVaihe });
  }
}

class HyvaksymisPaatosVaiheTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("HyvaksymisPaatosVaihe on jo olemassa odottamassa hyväksyntää");
    }

    await removeRejectionReasonIfExists(projekti, getHyvaksymisPaatosVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti);
    julkaisu.tila = HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA;
    julkaisu.muokkaaja = muokkaaja.uid;
    await projektiDatabase.insertHyvaksymisPaatosVaiheJulkaisu(projekti.oid, julkaisu);
    // TODO await aineistoService.publishHyvaksymisPaatosVaihe(projekti.oid, julkaisu.id);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const hyvaksymisPaatosVaihe = getHyvaksymisPaatosVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }
    await removeRejectionReasonIfExists(projekti, hyvaksymisPaatosVaihe);
    julkaisu.tila = HyvaksymisPaatosVaiheTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    // TODO: generoi PDFt

    await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(projekti, julkaisu);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }

    const hyvaksymisPaatosVaihe = getHyvaksymisPaatosVaihe(projekti);
    hyvaksymisPaatosVaihe.palautusSyy = syy;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, hyvaksymisPaatosVaihe });
    await projektiDatabase.deleteHyvaksymisPaatosVaiheJulkaisu(projekti, julkaisu.id);
  }
}

export const hyvaksymisPaatosVaiheTilaManager = new HyvaksymisPaatosVaiheTilaManager();
