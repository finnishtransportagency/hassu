import * as API from "hassu-common/graphql/apiModel";
import { auditLog } from "../../logger";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { IllegalArgumentError, SimultaneousUpdateError } from "hassu-common/error";
import { adaptHyvaksymisEsitysToSave } from "../adaptToSave/adaptHyvaksymisEsitysToSave";
import { tallennaMuokattavaHyvaksymisEsitys } from "../dynamoDBCalls";
import haeProjektinTiedotHyvaksymisEsityksesta, { HyvaksymisEsityksenTiedot } from "../dynamoDBCalls/getHyvaksymisEsityksenTiedot";
import { AineistoNew } from "../../database/model";
import getHyvaksymisEsityksenAineistot from "../getAineistot";

export default async function tallennaHyvaksymisEsitys(input: API.TallennaHyvaksymisEsitysInput): Promise<string> {
  requirePermissionLuku();
  const { oid, versio, muokattavaHyvaksymisEsitys } = input;
  try {
    // TODO lukitse dynamoDB
    const projektiInDB = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
    validate(projektiInDB, input);
    // Adaptoi muokattava hyvaksymisesitys ja tallenna se tietokantaan
    const newMuokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(projektiInDB.muokattavaHyvaksymisEsitys, muokattavaHyvaksymisEsitys);
    auditLog.info("Tallenna hyväksymisesitys", { input });
    await tallennaMuokattavaHyvaksymisEsitys({
      oid,
      versio,
      muokattavaHyvaksymisEsitys: newMuokattavaHyvaksymisEsitys,
    });
    if (
      uusiaAineistoja(
        getHyvaksymisEsityksenAineistot(projektiInDB.muokattavaHyvaksymisEsitys),
        getHyvaksymisEsityksenAineistot(newMuokattavaHyvaksymisEsitys)
      )
    ) {
      // TODO: reagoi mahdollisiin tiedostomuutoksiin
    }
    return oid;
  } finally {
    // TODO: poista lukitus
  }
}

function validate(projektiInDB: HyvaksymisEsityksenTiedot, input: API.TallennaHyvaksymisEsitysInput) {
  // Toiminnon tekijän on oltava projektihenkilö
  requirePermissionMuokkaa(projektiInDB);
  // Projektilla on oltava muokkaustilainen hyväksymisesitys tai
  // ei muokattavaa hyväksymisesitystä
  if (projektiInDB.muokattavaHyvaksymisEsitys && projektiInDB.muokattavaHyvaksymisEsitys?.tila !== API.HyvaksymisTila.MUOKKAUS) {
    throw new IllegalArgumentError("Projektilla tulee olla muokkaustilainen hyväksymisesitys tai ei vielä lainkaan hyväksymisesitystä");
  }
  if (input.versio !== projektiInDB.versio) {
    throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
  }
}

function uusiaAineistoja(aineistotBefore: AineistoNew[], aineistotAfter: AineistoNew[]): boolean {
  return aineistotAfter.some(({ uuid }) => !aineistotBefore.some(({ uuid: uuidBefore }) => uuidBefore == uuid));
}
