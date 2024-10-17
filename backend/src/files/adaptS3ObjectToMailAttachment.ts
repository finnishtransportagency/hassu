import { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import Mail from "nodemailer/lib/mailer";
import { Readable } from "stream";
import { log } from "../logger";

export default function adaptS3ObjectOutputToMailAttachment(
  { ContentType, Body }: GetObjectCommandOutput,
  key: string
): Mail.Attachment | undefined {
  if (!(Body instanceof Readable)) {
    log.error("Liitetiedoston sisällössä ongelmia");
    return undefined;
  }
  const contentType = !ContentType || ContentType == "null" ? "application/octet-stream" : ContentType;
  const getFilenamePartFromKey = (path: string) => path.substring(path.lastIndexOf("/") + 1);
  return {
    filename: getFilenamePartFromKey(key),
    contentDisposition: "attachment",
    contentType: contentType ?? "application/octet-stream",
    content: Body,
  };
}
