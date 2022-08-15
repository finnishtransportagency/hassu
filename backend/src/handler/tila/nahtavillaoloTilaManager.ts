import { NahtavillaoloVaiheTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { TilaManager } from "./TilaManager";
import { DBProjekti, NahtavillaoloVaihe } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";

function getNahtavillaoloVaihe(projekti: DBProjekti): NahtavillaoloVaihe {
  const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
  if (!nahtavillaoloVaihe) {
    throw new Error("Projektilla ei ole nahtavillaolovaihetta");
  }
  return nahtavillaoloVaihe;
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, nahtavillaoloVaihe: NahtavillaoloVaihe) {
  if (nahtavillaoloVaihe.palautusSyy) {
    nahtavillaoloVaihe.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
  }
}

class NahtavillaoloTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Nahtavillaolovaihe on jo olemassa odottamassa hyväksyntää");
    }

    await removeRejectionReasonIfExists(projekti, getNahtavillaoloVaihe(projekti));

    const nahtavillaoloVaiheJulkaisu = asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projekti);
    nahtavillaoloVaiheJulkaisu.tila = NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA;
    nahtavillaoloVaiheJulkaisu.muokkaaja = muokkaaja.uid;
    await projektiDatabase.insertNahtavillaoloVaiheJulkaisu(projekti.oid, nahtavillaoloVaiheJulkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const nahtavillaoloVaihe = getNahtavillaoloVaihe(projekti);
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }
    await removeRejectionReasonIfExists(projekti, nahtavillaoloVaihe);
    julkaisuWaitingForApproval.tila = NahtavillaoloVaiheTila.HYVAKSYTTY;
    julkaisuWaitingForApproval.hyvaksyja = projektiPaallikko.uid;

    // TODO: generoi PDFt

    await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(projekti, julkaisuWaitingForApproval);

    await aineistoService.publishNahtavillaolo(projekti.oid, julkaisuWaitingForApproval.id);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findNahtavillaoloWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei nähtävilläolovaihetta odottamassa hyväksyntää");
    }

    const nahtavillaoloVaihe = getNahtavillaoloVaihe(projekti);
    nahtavillaoloVaihe.palautusSyy = syy;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, nahtavillaoloVaihe });
    await projektiDatabase.deleteNahtavillaoloVaiheJulkaisu(projekti, julkaisuWaitingForApproval.id);
  }
}

export const nahtavillaoloTilaManager = new NahtavillaoloTilaManager();
