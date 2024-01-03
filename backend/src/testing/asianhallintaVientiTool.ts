import { projektiDatabase } from "../database/projektiDatabase";
import { asianhallintaService } from "../asianhallinta/asianhallintaService";

class AsianhallintaVientiTool {
  async kaynnista(oid: string) {
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new Error("Projektia ei löydy.");
    }

    const julkaisut: {
      asianhallintaEventId?: string | null;
    }[] = [
      ...(projekti.aloitusKuulutusJulkaisut ?? []),
      ...(projekti.vuorovaikutusKierrosJulkaisut ?? []),
      ...(projekti.nahtavillaoloVaiheJulkaisut ?? []),
      ...(projekti.hyvaksymisPaatosVaiheJulkaisut ?? []),
    ];

    for (const julkaisu of julkaisut) {
      if (julkaisu?.asianhallintaEventId) {
        const synkronointi = projekti.synkronoinnit?.[julkaisu.asianhallintaEventId];
        if (synkronointi?.dokumentit) {
          console.log("Käynnistetään asianhallinta-synkronointi", synkronointi.asianhallintaEventId);
          await asianhallintaService.enqueueSynchronization(projekti.oid, synkronointi.asianhallintaEventId);
        }
      }
    }
  }
}

export const asianhallintaVientiTool = new AsianhallintaVientiTool();
