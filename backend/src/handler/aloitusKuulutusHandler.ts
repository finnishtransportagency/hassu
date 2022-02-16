import {
  AloitusKuulutusTila,
  AsiakirjaTyyppi,
  Kieli,
  TilaSiirtymaInput,
  TilasiirtymaToiminto,
} from "../../../common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../user";
import { requireProjektiPaallikko } from "../user/userService";
import { projektiDatabase } from "../database/projektiDatabase";
import { asiakirjaAdapter } from "./asiakirjaAdapter";
import { AloitusKuulutus, AloitusKuulutusJulkaisu, DBProjekti } from "../database/model/projekti";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { fileService } from "../files/fileService";

async function sendForApproval(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus) {
  const muokkaaja = requirePermissionMuokkaa(projekti);
  const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
  if (julkaisuWaitingForApproval) {
    throw new Error("Aloituskuulutus on jo olemassa odottamassa hyväksyntää");
  }

  await removeRejectionReasonIfExists(projekti, aloitusKuulutus);

  const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
  aloitusKuulutusJulkaisu.tila = AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA;
  aloitusKuulutusJulkaisu.muokkaaja = muokkaaja.uid;
  await projektiDatabase.insertAloitusKuulutusJulkaisu(projekti.oid, aloitusKuulutusJulkaisu);
}

async function reject(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus, syy: string) {
  requireProjektiPaallikko(projekti);
  const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
  if (!julkaisuWaitingForApproval) {
    throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
  }
  aloitusKuulutus.palautusSyy = syy;
  await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
  await projektiDatabase.deleteAloitusKuulutusJulkaisu(projekti, julkaisuWaitingForApproval);
}

async function createAloituskuulutusPDF(
  asiakirjaTyyppi: AsiakirjaTyyppi,
  julkaisuWaitingForApproval: AloitusKuulutusJulkaisu,
  projekti: DBProjekti
) {
  const pdf = await asiakirjaService.createPdf({
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu: julkaisuWaitingForApproval,
    kieli: Kieli.SUOMI, // TODO: generoi kaikki kielet
  });
  return await fileService.createFileToProjekti({
    oid: projekti.oid,
    filePathInProjekti: "aloituskuulutus",
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
  });
}

async function approve(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus) {
  const projektiPaallikko = requireProjektiPaallikko(projekti);
  const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
  if (!julkaisuWaitingForApproval) {
    throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
  }
  await removeRejectionReasonIfExists(projekti, aloitusKuulutus);
  julkaisuWaitingForApproval.tila = AloitusKuulutusTila.HYVAKSYTTY;
  julkaisuWaitingForApproval.hyvaksyja = projektiPaallikko.uid;

  await projektiDatabase.updateAloitusKuulutusJulkaisu(projekti, julkaisuWaitingForApproval);

  julkaisuWaitingForApproval.aloituskuulutusPDFPath = await createAloituskuulutusPDF(
    AsiakirjaTyyppi.ALOITUSKUULUTUS,
    julkaisuWaitingForApproval,
    projekti
  );
  julkaisuWaitingForApproval.aloituskuulutusIlmoitusPDFPath = await createAloituskuulutusPDF(
    AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA,
    julkaisuWaitingForApproval,
    projekti
  );
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus) {
  if (aloitusKuulutus.palautusSyy) {
    aloitusKuulutus.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
  }
}

class AloitusKuulutusHandler {
  async siirraTila({ oid, syy, toiminto }: TilaSiirtymaInput) {
    requirePermissionLuku();
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    const aloitusKuulutus = projekti.aloitusKuulutus;
    if (!aloitusKuulutus) {
      throw new Error("Projektilla ei ole aloituskuulutusta");
    }

    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await sendForApproval(projekti, aloitusKuulutus);
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      await reject(projekti, aloitusKuulutus, syy);
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      await approve(projekti, aloitusKuulutus);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }
}

export const aloitusKuulutusHandler = new AloitusKuulutusHandler();
