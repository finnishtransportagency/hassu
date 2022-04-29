import yargs from "yargs";
import { openSearchClient } from "../../backend/src/projektiSearch/openSearchClient";
import fs from "fs";

yargs
  .scriptName("npm run opensearch")
  .command(
    "getsettings [index] [outputFileName]",
    "Download search index settings",
    (yargs) => {
      yargs
        .positional("index", {
          type: "string",
          default: "projekti",
          describe: "OpenSearch index name",
          demandOption: true,
        })
        .positional("outputFileName", {
          type: "string",
          describe: "Output file name",
          demandOption: true,
        });
    },
    function (argv) {
      console.log("Get settings from " + argv.index + " to " + argv.outputFileName);
      openSearchClient
        .getSettings(argv.index as string)
        .then((result) => {
          fs.writeFileSync(argv.outputFileName as string, JSON.stringify(result, null, 2));
          console.log("Finished");
        })
        .catch((err) => console.error(err));
    }
  )
  .command(
    "putsettings [index] [outputFileName]",
    "Update search index settings",
    (yargs) => {
      yargs
        .positional("index", {
          type: "string",
          default: "projekti",
          describe: "OpenSearch index name",
          demandOption: true,
        })
        .positional("inputFileName", {
          type: "string",
          describe: "Input file name",
          demandOption: true,
        });
    },
    function (argv) {
      console.log("Update settings to index " + argv.index + " from " + argv.outputFileName);
      let settings = fs.readFileSync(argv.outputFileName as string).toString("UTF-8");
      openSearchClient
        .putSettings(argv.index as string, settings)
        .then((result) => {
          console.log("Finished\n" + JSON.stringify(result, null, 2));
        })
        .catch((err) => console.error(err));
    }
  )
  .command(
    "getmapping [index] [outputFileName]",
    "Download search index mapping",
    (yargs) => {
      yargs
        .positional("index", {
          type: "string",
          default: "projekti",
          describe: "OpenSearch index name",
          demandOption: true,
        })
        .positional("outputFileName", {
          type: "string",
          describe: "Output file name",
          demandOption: true,
        });
    },
    function (argv) {
      console.log("Get mapping from " + argv.index + " to " + argv.outputFileName);
      openSearchClient
        .getMapping(argv.index as string)
        .then((result) => {
          fs.writeFileSync(argv.outputFileName as string, JSON.stringify(result, null, 2));
          console.log("Finished");
        })
        .catch((err) => console.error(err));
    }
  )
  .command(
    "putmapping [index] [outputFileName]",
    "Update search index mapping",
    (yargs) => {
      yargs
        .positional("index", {
          type: "string",
          default: "projekti",
          describe: "OpenSearch index name",
          demandOption: true,
        })
        .positional("inputFileName", {
          type: "string",
          describe: "Input file name",
          demandOption: true,
        });
    },
    function (argv) {
      console.log("Update mapping to index " + argv.index + " from " + argv.outputFileName);
      const mapping = fs.readFileSync(argv.outputFileName as string).toString("UTF-8");
      openSearchClient
        .putMapping(argv.index as string, mapping)
        .then((result) => {
          console.log("Finished\n" + JSON.stringify(result, null, 2));
        })
        .catch((err) => console.error(err));
    }
  )
  .strictCommands()
  .demandCommand(1)
  .help().argv;
