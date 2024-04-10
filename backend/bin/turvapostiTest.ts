import { SSM } from "@aws-sdk/client-ssm";
import { TurvapostiConfig, getTurvapostiTransport } from "../src/email/email";
import { MailOptions } from "nodemailer/lib/smtp-transport";
import { parse } from "yaml";

const euWestSSMClient = new SSM({ region: "eu-west-1" });
euWestSSMClient
  .getParameter({
    Name: "TurvapostiConfig",
    WithDecryption: true,
  })
  .catch((e) => {
    throw new Error("TurvapostiConfig not found");
  })
  .then((output) => {
    return output.Parameter?.Value!;
  })
  .then((config) => {
    if (process.argv.length !== 4) {
      throw new Error("Vastaanottaja ja lähettäjä annettava parametrina");
    }
    const cfg: TurvapostiConfig = parse(config);
    const transport = getTurvapostiTransport(cfg);
    const mailOptions: MailOptions = { to: process.argv[2], subject: "Turvaposti testi", text: "Testiviesti", from: process.argv[3] };
    console.log("Viesti: %o", mailOptions);
    return transport.sendMail(mailOptions);
  })
  .then((response) => console.log("response: %o", response))
  .catch((e) => console.error(e));
