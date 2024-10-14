import { TallennaEnnakkoNeuvotteluInput } from "hassu-common/graphql/apiModel";
import { EnnakkoneuvotteluValidationContext, ennakkoNeuvotteluSchema } from "hassu-common/schema/ennakkoNeuvotteluSchema";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../user";
import { assertIsDefined } from "../util/assertions";
import { auditLog } from "../logger";
import projektiDatabase from "../HyvaksymisEsitys/dynamoKutsut";
import { SimultaneousUpdateError } from "hassu-common/error";
import { ValidationMode } from "hassu-common/ProjektiValidationContext";
import { TestType } from "hassu-common/schema/common";
import { DBEnnakkoNeuvotteluJulkaisu, DBProjekti, IHyvaksymisEsitys } from "../database/model";
import { validateVaiheOnAktiivinen } from "../HyvaksymisEsitys/validateVaiheOnAktiivinen";
import { SqsClient } from "../HyvaksymisEsitys/aineistoHandling/sqsClient";
import { persistFile } from "../HyvaksymisEsitys/s3Calls/persistFile";
import { deleteFilesUnderSpecifiedVaihe } from "../HyvaksymisEsitys/s3Calls/deleteFiles";
import { adaptEnnakkoNeuvotteluToSave } from "./mapper";
import {
  getHyvaksymisEsityksenPoistetutTiedostot,
  getHyvaksymisEsityksenUudetLadatutTiedostot,
} from "../HyvaksymisEsitys/getLadatutTiedostot";
import getHyvaksymisEsityksenAineistot, { getHyvaksymisEsityksenPoistetutAineistot } from "../HyvaksymisEsitys/getAineistot";
import { uusiaAineistoja } from "../HyvaksymisEsitys/actions/tallenna";
import { HyvaksymisEsitysAineistoOperation } from "../HyvaksymisEsitys/aineistoHandling/sqsEvent";
import { nyt } from "../util/dateUtil";
import { cloneDeep } from "lodash";

export const ENNAKKONEUVOTTELU_PATH = "ennakkoneuvottelu";

async function validate(projektiInDB: DBProjekti, input: TallennaEnnakkoNeuvotteluInput) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  if (input.versio !== projektiInDB.versio) {
    throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
  }
  const context: EnnakkoneuvotteluValidationContext = { validationMode: { current: ValidationMode.DRAFT }, testType: TestType.BACKEND };
  ennakkoNeuvotteluSchema.validateSync(input, {
    context,
  });
  // Vaiheen on oltava vähintään NAHTAVILLAOLO_AINEISTOT
  await validateVaiheOnAktiivinen(projektiInDB);
}

export async function tallennaEnnakkoNeuvottelu(input: TallennaEnnakkoNeuvotteluInput): Promise<string> {
  const nykyinenKayttaja = requirePermissionLuku();
  const { oid, versio, ennakkoNeuvottelu, laheta } = input;
  try {
    await projektiDatabase.setLock(oid);
    const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projektiInDB, "projekti pitää olla olemassa");
    await validate(projektiInDB, input);
    const newEnnakkoNeuvottelu = adaptEnnakkoNeuvotteluToSave(projektiInDB.ennakkoNeuvottelu, ennakkoNeuvottelu);
    const uudetTiedostot = getHyvaksymisEsityksenUudetLadatutTiedostot(
      projektiInDB.ennakkoNeuvottelu as IHyvaksymisEsitys,
      ennakkoNeuvottelu
    );
    if (uudetTiedostot.length) {
      await Promise.all(
        uudetTiedostot.map((ladattuTiedosto) => persistFile({ oid, ladattuTiedosto, vaihePrefix: ENNAKKONEUVOTTELU_PATH }))
      );
    }
    const poistetutTiedostot = getHyvaksymisEsityksenPoistetutTiedostot(
      projektiInDB.ennakkoNeuvottelu as IHyvaksymisEsitys,
      newEnnakkoNeuvottelu as IHyvaksymisEsitys
    );
    const poistetutAineistot = getHyvaksymisEsityksenPoistetutAineistot(
      projektiInDB.ennakkoNeuvottelu as IHyvaksymisEsitys,
      newEnnakkoNeuvottelu as IHyvaksymisEsitys
    );
    if (poistetutTiedostot.length || poistetutAineistot.length) {
      await deleteFilesUnderSpecifiedVaihe(oid, ENNAKKONEUVOTTELU_PATH, [...poistetutTiedostot, ...poistetutAineistot]);
    }
    auditLog.info("Tallenna ennakkoneuvottelu", { oid, versio, newEnnakkoNeuvottelu });
    assertIsDefined(nykyinenKayttaja.uid, "Nykyisellä käyttäjällä on oltava uid");
    const newEnnakkoNeuvotteluJulkaisu: DBEnnakkoNeuvotteluJulkaisu | undefined = laheta
      ? { ...cloneDeep(newEnnakkoNeuvottelu), lahetetty: nyt().toISOString() }
      : undefined;
    await projektiDatabase.tallennaEnnakkoNeuvottelu({
      oid,
      versio,
      ennakkoNeuvottelu: newEnnakkoNeuvottelu,
      ennakkoNeuvotteluJulkaisu: newEnnakkoNeuvotteluJulkaisu,
      muokkaaja: nykyinenKayttaja.uid,
    });
    if (
      uusiaAineistoja(
        getHyvaksymisEsityksenAineistot(projektiInDB.ennakkoNeuvottelu as IHyvaksymisEsitys),
        getHyvaksymisEsityksenAineistot(newEnnakkoNeuvottelu as IHyvaksymisEsitys),
        projektiInDB.aineistoHandledAt
      )
    ) {
      await SqsClient.addEventToSqsQueue({ operation: HyvaksymisEsitysAineistoOperation.TUO_ENNAKKONEUVOTTELU_TIEDOSTOT, oid });
    }
    return oid;
  } finally {
    await projektiDatabase.releaseLock(oid);
  }
}
