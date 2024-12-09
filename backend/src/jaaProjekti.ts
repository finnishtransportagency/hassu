import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { IllegalArgumentError, SimultaneousUpdateError } from "hassu-common/error";
import { JaaProjektiMutationVariables as Variables } from "hassu-common/graphql/apiModel";
import { cloneDeep, omit } from "lodash";
import log from "loglevel";
import { getDynamoDBDocumentClient } from "./aws/client";
import { config } from "./config";
import { DBProjekti } from "./database/model";
import { JULKAISU_KEYS } from "./database/model/julkaisuKey";
import { projektiDatabase } from "./database/projektiDatabase";
import { fileService } from "./files/fileService";
import { ProjektiPaths } from "./files/ProjektiPath";
import { lisaAineistoService } from "./tiedostot/lisaAineistoService";
import { requireAdmin } from "./user";
import { velho as velhoClient } from "./velho/velhoClient";

export async function jaaProjekti(input: Variables) {
  requireAdmin();
  const srcProjekti = await projektiDatabase.loadProjektiByOid(input.oid);
  if (!srcProjekti) {
    throw new IllegalArgumentError(`Jaettavaa projektia ei löydy oid:lla '${input.oid}'`);
  }
  const targetProjekti = await projektiDatabase.loadProjektiByOid(input.targetOid);
  if (targetProjekti) {
    throw new IllegalArgumentError(`Kohde projekti oid:lla '${input.targetOid}' on jo VLS-järjestelmässä`);
  }

  const targetProjektiFromVelho = await velhoClient.loadProjekti(input.targetOid);
  if (!targetProjektiFromVelho.velho) {
    throw new Error(`Kohde projektia oid:lla '${input.targetOid}' ei löydy Projektivelhosta`);
  }

  const clonedProjekti = cloneDeep(srcProjekti);
  JULKAISU_KEYS.forEach((julkaisuKey) =>
    clonedProjekti[julkaisuKey]?.forEach((julkaisu) => {
      julkaisu.kopioituProjektista = input.oid;
    })
  );

  const keysToOmit: (keyof DBProjekti)[] = ["oid", "velho", "kayttoOikeudet", "salt", "jakautuminen"];
  const targetProjektiToCreate: DBProjekti = {
    ...omit(clonedProjekti, ...keysToOmit),
    oid: input.targetOid,
    versio: srcProjekti.versio ?? 1,
    velho: targetProjektiFromVelho.velho,
    kayttoOikeudet: targetProjektiFromVelho.kayttoOikeudet,
    jakautuminen: { kopioituProjektista: input.oid },
    salt: lisaAineistoService.generateSalt(),
  };

  await updateJaettuProjekteihin(input);
  await projektiDatabase.createProjekti(targetProjektiToCreate);
  await fileService.copyYllapitoFolder(new ProjektiPaths(input.oid), new ProjektiPaths(input.targetOid));
}

async function updateJaettuProjekteihin({ oid, versio, targetOid }: Variables) {
  const jakautuminenInput: UpdateCommandInput = {
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "ADD versio :one SET jakautuminen = :jakautuminen",
    ExpressionAttributeValues: {
      ":jakautuminen": { kopioituProjekteihin: [targetOid] },
      ":versio": versio,
      ":one": 1,
    },
    ConditionExpression: "(attribute_not_exists(versio) OR versio = :versio) AND attribute_not_exists(jakautuminen)",
  };
  const tietojaVietyInput: UpdateCommandInput = {
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression:
      "ADD versio :one SET jakautuminen.kopioituProjekteihin = list_append(if_not_exists(jakakautuminen.kopioituProjekteihin, :tyhjalista), :targetOid)",
    ExpressionAttributeValues: {
      ":targetOid": [targetOid],
      ":tyhjalista": [],
      ":versio": versio,
      ":one": 1,
    },
    ConditionExpression: "(attribute_not_exists(versio) OR versio = :versio) AND attribute_exists(jakautuminen)",
  };
  try {
    await getDynamoDBDocumentClient().send(new UpdateCommand(jakautuminenInput));
    return;
  } catch (e) {
    if (!(e instanceof ConditionalCheckFailedException)) {
      log.error(e instanceof Error ? e.message : String(e), { jakautuminenInput });
      throw e;
    }
  }
  try {
    await getDynamoDBDocumentClient().send(new UpdateCommand(tietojaVietyInput));
    return;
  } catch (e) {
    if (e instanceof ConditionalCheckFailedException) {
      throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
    }
    log.error(e instanceof Error ? e.message : String(e), { tietojaVietyInput });
    throw e;
  }
}
