import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { velho } from "../src/velho/velhoClient";

const argv = yargs(hideBin(process.argv)).describe("oid", "Projekti oid to delete").demandOption(["oid"]).parse() as {
  oid: string;
};

(async () => {
  if (process.env.ENVIRONMENT === "prod" && !process.env.VELHO_API_URL.includes("stg")) {
    throw new Error("Not allowed in production!");
  }
  return await velho.deleteProjektiForTesting(argv.oid);
})();
