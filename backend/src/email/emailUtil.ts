import { EmailOptions } from "./email";
import MailComposer from "nodemailer/lib/mail-composer";
import { LadattuTiedosto } from "../database/model";
import { PathTuple } from "../files/ProjektiPath";
import { AsiakirjaTyyppi } from "../../../common/graphql/apiModel";
import { fileService } from "../files/fileService";
import { dateTimeToString } from "../util/dateUtil";
import dayjs from "dayjs";

export async function saveEmailAsFile(
  oid: string,
  path: PathTuple,
  lahetekirje: EmailOptions,
  asiakirjaTyyppi: AsiakirjaTyyppi
): Promise<LadattuTiedosto> {
  const fileName = "lähetekirje.eml";
  const contents = await emailOptionsToEml(lahetekirje);
  const filePath = await fileService.createFileToProjekti({
    oid,
    path,
    fileName,
    contents,
    contentType: "message/rfc822",
    asiakirjaTyyppi,
    inline: false,
  });
  return {
    nimi: fileName,
    tiedosto: filePath,
    tuotu: dateTimeToString(dayjs()),
  };
}

async function emailOptionsToEml(emailOptions: EmailOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mail = new MailComposer(emailOptions);
    mail.compile().build(function (err, message) {
      if (err) {
        reject(err);
      }
      resolve(message);
    });
  });
}
