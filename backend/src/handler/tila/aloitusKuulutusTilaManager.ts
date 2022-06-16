import { AloitusKuulutusTila, AsiakirjaTyyppi, Kieli, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { projektiDatabase } from "../../database/projektiDatabase";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { AloitusKuulutus, AloitusKuulutusJulkaisu, AloitusKuulutusPDF, DBProjekti } from "../../database/model";
import { asiakirjaService } from "../../asiakirja/asiakirjaService";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { TilaManager } from "./TilaManager";

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
    luonnos: false,
  });
  return fileService.createFileToProjekti({
    oid: projekti.oid,
    filePathInProjekti: "aloituskuulutus",
    fileName: pdf.nimi,
    contents: Buffer.from(pdf.sisalto, "base64"),
    inline: true,
    contentType: "application/pdf",
    publicationTimestamp: parseDate(julkaisuWaitingForApproval.kuulutusPaiva),
    copyToPublic: true,
  });
}

async function removeRejectionReasonIfExists(projekti: DBProjekti, aloitusKuulutus: AloitusKuulutus) {
  if (aloitusKuulutus.palautusSyy) {
    aloitusKuulutus.palautusSyy = null;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
  }
}

function getAloitusKuulutus(projekti: DBProjekti) {
  const aloitusKuulutus = projekti.aloitusKuulutus;
  if (!aloitusKuulutus) {
    throw new Error("Projektilla ei ole aloituskuulutusta");
  }
  return aloitusKuulutus;
}

class AloitusKuulutusTilaManager extends TilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("Aloituskuulutus on jo olemassa odottamassa hyväksyntää");
    }

    await removeRejectionReasonIfExists(projekti, getAloitusKuulutus(projekti));

    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    aloitusKuulutusJulkaisu.tila = AloitusKuulutusTila.ODOTTAA_HYVAKSYNTAA;
    aloitusKuulutusJulkaisu.muokkaaja = muokkaaja.uid;
    await projektiDatabase.insertAloitusKuulutusJulkaisu(projekti.oid, aloitusKuulutusJulkaisu);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
    }

    const aloitusKuulutus = getAloitusKuulutus(projekti);
    aloitusKuulutus.palautusSyy = syy;
    await projektiDatabase.saveProjekti({ oid: projekti.oid, aloitusKuulutus });
    await projektiDatabase.deleteAloitusKuulutusJulkaisu(projekti, julkaisuWaitingForApproval.id);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const aloitusKuulutus = getAloitusKuulutus(projekti);
    const julkaisuWaitingForApproval = asiakirjaAdapter.findAloitusKuulutusWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei aloituskuulutusta odottamassa hyväksyntää");
    }
    await removeRejectionReasonIfExists(projekti, aloitusKuulutus);
    julkaisuWaitingForApproval.tila = AloitusKuulutusTila.HYVAKSYTTY;
    julkaisuWaitingForApproval.hyvaksyja = projektiPaallikko.uid;

    const kielitiedot = julkaisuWaitingForApproval.kielitiedot;

    async function generatePDFsForLanguage(
      kieli: Kieli,
      julkaisu: AloitusKuulutusJulkaisu
    ): Promise<AloitusKuulutusPDF> {
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

    julkaisuWaitingForApproval.aloituskuulutusPDFt = {};
    julkaisuWaitingForApproval.aloituskuulutusPDFt[kielitiedot.ensisijainenKieli] = await generatePDFsForLanguage(
      kielitiedot.ensisijainenKieli,
      julkaisuWaitingForApproval
    );

    if (kielitiedot.toissijainenKieli) {
      julkaisuWaitingForApproval.aloituskuulutusPDFt[kielitiedot.toissijainenKieli] = await generatePDFsForLanguage(
        kielitiedot.toissijainenKieli,
        julkaisuWaitingForApproval
      );

      if (projekti.suunnitteluSopimus?.logo) {
        await fileService.publishProjektiFile(
          projekti.oid,
          projekti.suunnitteluSopimus?.logo,
          parseDate(julkaisuWaitingForApproval.kuulutusPaiva)
        );
      }
    }

    await projektiDatabase.updateAloitusKuulutusJulkaisu(projekti, julkaisuWaitingForApproval);
  }
}

export const aloitusKuulutusTilaManager = new AloitusKuulutusTilaManager();
