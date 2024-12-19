import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { IllegalArgumentError, SimultaneousUpdateError } from "hassu-common/error";
import { JaaProjektiMutationVariables as Variables } from "hassu-common/graphql/apiModel";
import cloneDeep from "lodash/cloneDeep";
import log from "loglevel";
import { getDynamoDBDocumentClient } from "./aws/client";
import { config } from "./config";
import { DBProjekti } from "./database/model";
import { JULKAISU_KEYS } from "./database/model/julkaisuKey";
import { muistuttajaDatabase } from "./database/muistuttajaDatabase";
import { feedbackDatabase } from "./database/palauteDatabase";
import { projektiDatabase } from "./database/projektiDatabase";
import { fileService } from "./files/fileService";
import { ProjektiPaths } from "./files/ProjektiPath";
import { haeVelhoSynkronoinninMuutoksetTallennukseen } from "./projekti/projektiHandler";
import { lisaAineistoService } from "./tiedostot/lisaAineistoService";
import { requireAdmin } from "./user";
import { velho as velhoClient } from "./velho/velhoClient";

export async function jaaProjekti(input: Variables) {
  requireAdmin();
  const srcProjekti = await projektiDatabase.loadProjektiByOid(input.oid);
  if (!srcProjekti) {
    throw new IllegalArgumentError(`Jaettavaa projektia ei löydy oid:lla '${input.oid}'`);
  }
  if (srcProjekti.projektinJakautuminen?.jaettuProjekteihin?.length || srcProjekti.projektinJakautuminen?.jaettuProjektista) {
    throw new IllegalArgumentError(`Jaettava projekti '${input.oid}' on jo aiemmin jaettu. Projektia ei voi jakaa kuin vain kerran.`);
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

  const synkronoinnistaTallennettavatTiedot = await haeVelhoSynkronoinninMuutoksetTallennukseen(
    input.targetOid,
    srcProjekti,
    targetProjektiFromVelho.velho
  );
  const {
    oid: _oid,
    salt: _salt,
    projektinJakautuminen: _projektinJakautuminen,
    omistajahaku: _omistajahaku,
    velho: _velho,
    kayttoOikeudet: _kayttooikeudet,
    asianhallinta: _asianhallinta,
    suunnitteluSopimus: _suunnitteluSopimus,
    ...kopioitavatKentat
  } = clonedProjekti;
  const targetProjektiToCreate: DBProjekti = {
    ...kopioitavatKentat,
    ...synkronoinnistaTallennettavatTiedot,
    projektinJakautuminen: { jaettuProjektista: input.oid },
    salt: lisaAineistoService.generateSalt(),
  };

  await updateJaettuProjekteihin(input);
  await projektiDatabase.createProjekti(targetProjektiToCreate);
  await fileService.copyYllapitoFolder(new ProjektiPaths(input.oid), new ProjektiPaths(input.targetOid));
  await muistuttajaDatabase.copyKaytossaolevatMuistuttajatToAnotherProjekti(input.oid, input.targetOid);
  await feedbackDatabase.copyFeedbackToAnotherProjekti(input.oid, input.targetOid);
  await fileService.deleteYllapitoFileFromProjekti({
    oid: input.targetOid,
    filePathInProjekti: "/karttarajaus/karttarajaus.geojson",
    reason: "Projekti jaettu osiin. Karttarajausta ei haluta siirtää projektilta toiselle.",
  });
}

async function updateJaettuProjekteihin({ oid, versio, targetOid }: Variables) {
  const jakautuminenInput: UpdateCommandInput = {
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression: "ADD versio :one SET projektinJakautuminen = :projektinJakautuminen",
    ExpressionAttributeValues: {
      ":projektinJakautuminen": { jaettuProjekteihin: [targetOid] },
      ":versio": versio,
      ":one": 1,
    },
    ConditionExpression: "(attribute_not_exists(versio) OR versio = :versio) AND attribute_not_exists(projektinJakautuminen)",
  };
  const tietojaVietyInput: UpdateCommandInput = {
    TableName: config.projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression:
      "ADD versio :one SET projektinJakautuminen.jaettuProjekteihin = list_append(if_not_exists(projektinJakautuminen.jaettuProjekteihin, :tyhjalista), :targetOid)",
    ExpressionAttributeValues: {
      ":targetOid": [targetOid],
      ":tyhjalista": [],
      ":versio": versio,
      ":one": 1,
    },
    ConditionExpression: "(attribute_not_exists(versio) OR versio = :versio) AND attribute_exists(projektinJakautuminen)",
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
