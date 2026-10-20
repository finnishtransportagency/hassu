// Contains code generated or recommended by Amazon Q
import { LisaaMielipideMutationVariables, Status } from "hassu-common/graphql/apiModel";
import { NotFoundError } from "hassu-common/error";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { auditLog, log } from "../logger";
import { uuid } from "hassu-common/util/uuid";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import { DBMielipide, mielipideDatabase } from "../database/mielipideDatabase";
import { config } from "../config";
import { fileService } from "../files/fileService";
import { getSQS } from "../aws/clients/getSQS";
import { parameters } from "../aws/parameters";
import { EmailEventType, MielipideKirjaamoEmailEvent } from "../email/model/emailEvent";

function getExpires() {
  const days = config.isPermanentEnvironment() ? 2557 : 90;
  return Math.round(Date.now() / 1000) + 60 * 60 * 24 * days;
}

class MielipideHandler {
  async kasitteleMielipide({ oid, mielipide: mielipideInput }: LisaaMielipideMutationVariables) {
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      log.error("Projektia ei löydy");
      throw new NotFoundError("Projektia ei löydy");
    }
    const julkinenProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (!julkinenProjekti) {
      log.error("Projektia ei löydy tai se ei ole vielä julkinen");
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }
    if (julkinenProjekti.status !== Status.NAHTAVILLAOLO) {
      log.error("Projekti ei ole nähtävilläolovaiheessa, joten mielipiteitä ei voi antaa", julkinenProjekti.status);
      throw new NotFoundError("Projekti ei ole nähtävilläolovaiheessa, joten mielipiteitä ei voi antaa");
    }

    const mielipideId = uuid.v4();
    const liitteet = await this.persistLiitteet(mielipideInput.liitteet, oid, mielipideId);

    const mielipide: DBMielipide = {
      oid,
      id: mielipideId,
      expires: getExpires(),
      lisatty: nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      mielipide: mielipideInput.mielipide,
      liitteet,
      etunimi: mielipideInput.etunimi,
      sukunimi: mielipideInput.sukunimi,
      lahiosoite: mielipideInput.lahiosoite,
      postinumero: mielipideInput.postinumero,
      postitoimipaikka: mielipideInput.postitoimipaikka,
      sahkoposti: mielipideInput.sahkoposti,
      puhelinnumero: mielipideInput.puhelinnumero,
    };

    auditLog.info("Tallennetaan mielipide", { mielipideId });
    await mielipideDatabase.tallennaMielipide(mielipide);

    const msg: MielipideKirjaamoEmailEvent = {
      type: EmailEventType.MIELIPIDE_KIRJAAMO,
      oid,
      mielipideId,
    };
    const emailSQSUrl = await parameters.getEmailSQSUrl();
    await getSQS().sendMessage({ QueueUrl: emailSQSUrl, MessageBody: JSON.stringify(msg) });

    return "OK";
  }

  private async persistLiitteet(liitteet: string[] | undefined | null, oid: string, mielipideId: string): Promise<DBMielipide["liitteet"]> {
    if (!liitteet) {
      return liitteet;
    }
    return await Promise.all(
      liitteet.map(async (liite) => {
        const tiedosto = await fileService.persistFileToProjekti({
          uploadedFileSource: liite,
          oid,
          targetFilePathInProjekti: "mielipiteet/" + mielipideId,
        });
        if (!tiedosto) {
          throw new NotFoundError("Liitettä ei löydy");
        }
        return tiedosto;
      })
    );
  }
}

export const mielipideHandler = new MielipideHandler();
