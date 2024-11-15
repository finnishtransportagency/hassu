import { log } from "../logger";
import { config } from "../config";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBDocumentClient } from "../aws/client";
import { Kieli, Status } from "hassu-common/graphql/apiModel";
import { chunkArray } from "../database/chunkArray";
import { migrateFromOldSchema } from "../database/projektiSchemaUpdate";
import { DBProjekti } from "../database/model";
import { projektiAdapterJulkinen } from "./adapter/projektiAdapterJulkinen";

export type LiittyvaProjekti = {
  oid: string;
  nimiSuomi: string;
  nimiRuotsi: string | undefined;
  julkinen: boolean;
};

export async function haeLiittyvienProjektienTiedot(oids: string[]): Promise<LiittyvaProjekti[] | undefined> {
  const tableName = config.projektiTableName;
  if (!tableName) {
    return undefined;
  }
  const result: LiittyvaProjekti[] = [];
  const oidBatches = chunkArray(
    oids.map((oid) => ({ oid })),
    100
  );

  for (const batch of oidBatches) {
    let Keys = batch;
    do {
      const params = new BatchGetCommand({
        RequestItems: {
          [tableName]: { Keys },
        },
      });
      const data = await getDynamoDBDocumentClient().send(params);

      const projektiResponses = data?.Responses?.[tableName];
      if (projektiResponses) {
        const projektienTiedot = await Promise.all(
          projektiResponses.map(async (item) => {
            const projekti = item as DBProjekti;
            projekti.tallennettu = true;
            const julkinenProjekti = await projektiAdapterJulkinen.adaptProjekti(migrateFromOldSchema(projekti), Kieli.SUOMI);
            const julkinen =
              julkinenProjekti?.status &&
              ![Status.EI_JULKAISTU, Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(
                julkinenProjekti.status
              );
            return {
              oid: projekti.oid,
              nimiSuomi: projekti.velho?.nimi as string | undefined,
              nimiRuotsi:
                projekti.kielitiedot?.projektinNimiVieraskielella &&
                [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(Kieli.RUOTSI)
                  ? projekti.kielitiedot?.projektinNimiVieraskielella
                  : undefined,
              julkinen,
            };
          })
        );

        const responses = projektienTiedot.filter((projektinNimitiedot): projektinNimitiedot is LiittyvaProjekti => {
          const suomiNimiAsetettu = !!projektinNimitiedot.nimiSuomi;
          if (!suomiNimiAsetettu) {
            log.warn("Projektille ei löydy nimitietoja", { oid: projektinNimitiedot.oid });
          }
          return suomiNimiAsetettu;
        });
        result.push(...responses);
      } else {
        log.warn("BatchGetItem kysely ei palauttanut responseja projekteille", { oids });
      }
      Keys = (data?.UnprocessedKeys?.[tableName]?.Keys as { oid: string }[]) ?? [];
    } while (Keys.length);
  }

  return result;
}
