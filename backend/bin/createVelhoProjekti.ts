/* tslint:disable:no-console */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { velho } from "../src/velho/velhoClient";

const argv = yargs(hideBin(process.argv)).describe("templateName", "Projekti template name").demandOption(["templateName"]).parse() as {
  templateName: string;
};

(async () => {
  if (process.env.ENVIRONMENT === "prod" && process.env.VELHO_API_URL && !process.env.VELHO_API_URL.includes("stg")) {
    throw new Error("Not allowed in production!");
  }

  const template = (await import(__dirname + "/templates/" + argv.templateName)).default;

  const result = await velho.createProjektiForTesting(template);
  if (result && result.oid) {
    console.log(JSON.stringify({ oid: result.oid }));
  } else {
    console.error("Error creating projekti: " + result);
  }
})();
