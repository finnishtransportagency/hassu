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
import { AloitusKuulutus, AloitusKuulutusJulkaisu, AloitusKuulutusPDF, DBProjekti } from "../database/model/projekti";
import { asiakirjaService } from "../asiakirja/asiakirjaService";
import { fileService } from "../files/fileService";
import { sendEmail } from "../email/email";
import { createHyvaksyttavanaEmail } from "../email/emailTemplates";
import { log } from "../logger";

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

  const emailOptions = createHyvaksyttavanaEmail(projekti);
  if (emailOptions.to) {
    await sendEmail(emailOptions);
  } else {
    log.error("Aloituskuulutukselle ei loytynyt projektipaallikon sahkopostiosoitetta");
  }
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
  projekti: DBProjekti,
  kieli: Kieli
) {
  const pdf = await asiakirjaService.createPdf({
    asiakirjaTyyppi,
    aloitusKuulutusJulkaisu: julkaisuWaitingForApproval,
    kieli,
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

  const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

  async function generatePDFsForLanguage(kieli: Kieli, julkaisu: AloitusKuulutusJulkaisu): Promise<AloitusKuulutusPDF> {
    const aloituskuulutusPDFPath = await createAloituskuulutusPDF(
      AsiakirjaTyyppi.ALOITUSKUULUTUS,
      julkaisu,
      projekti,
      kieli
    );
    const aloituskuulutusIlmoitusPDFPath = await createAloituskuulutusPDF(
      AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA,
      julkaisu,
      projekti,
      kieli
    );
    return { aloituskuulutusPDFPath, aloituskuulutusIlmoitusPDFPath };
  }

  julkaisuWaitingForApproval.aloituskuulutusPDF = {};
  julkaisuWaitingForApproval.aloituskuulutusPDF[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(
    kielitiedot.ensisijainenKieli,
    julkaisuWaitingForApproval
  );

  if (kielitiedot.toissijainenKieli) {
    julkaisuWaitingForApproval.aloituskuulutusPDF[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(
      kielitiedot.toissijainenKieli,
      julkaisuWaitingForApproval
    );
  }

  await projektiDatabase.updateAloitusKuulutusJulkaisu(projekti, julkaisuWaitingForApproval);
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
