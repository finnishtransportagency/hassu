import { config } from "../config";
import { Kieli, ProjektinJakotieto, Status } from "hassu-common/graphql/apiModel";
import { migrateFromOldSchema } from "../database/projektiSchemaUpdate";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";
import { projektiDatabase } from "../database/projektiDatabase";

export async function haeLiittyvanProjektinTiedot(oid: string): Promise<ProjektinJakotieto | undefined> {
  if (!config.projektiTableName) {
    return undefined;
  }

  const projekti = await projektiDatabase.loadProjektiByOid(oid);

  if (!projekti) {
    return undefined;
  }

  const julkinenProjekti = await projektiAdapterJulkinen.adaptProjekti(migrateFromOldSchema(projekti), Kieli.SUOMI);
  const julkinen =
    !!julkinenProjekti?.status &&
    ![Status.EI_JULKAISTU, Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(julkinenProjekti.status);

  if (!projekti.velho?.nimi) {
    return undefined;
  }

  const LiittyvaProjekti: ProjektinJakotieto = {
    oid,
    __typename: "ProjektinJakotieto",
    nimi: {
      __typename: "LokalisoituTeksti",
      SUOMI: projekti.velho.nimi,
      RUOTSI:
        projekti.kielitiedot?.projektinNimiVieraskielella &&
        [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
          ? projekti.kielitiedot?.projektinNimiVieraskielella
          : undefined,
    },
    julkinen,
  };
  return LiittyvaProjekti;
}
