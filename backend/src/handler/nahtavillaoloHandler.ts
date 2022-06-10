import { TilaSiirtymaInput, TilasiirtymaToiminto } from "../../../common/graphql/apiModel";
import { requirePermissionLuku } from "../user";
import { projektiDatabase } from "../database/projektiDatabase";

class NahtavillaoloHandler {
  async siirraTila({ oid, syy: _syy, toiminto }: TilaSiirtymaInput) {
    requirePermissionLuku();
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    const aloitusKuulutus = projekti.aloitusKuulutus;
    if (!aloitusKuulutus) {
      throw new Error("Projektilla ei ole aloituskuulutusta");
    }

    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      // TODO
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      // TODO
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      // TODO
    } else {
      throw new Error("Tuntematon toiminto");
    }

    // await emailHandler.sendEmailsByToiminto(toiminto, oid);

    return Promise.resolve(undefined);
  }
}

export const nahtavillaoloHandler = new NahtavillaoloHandler();
