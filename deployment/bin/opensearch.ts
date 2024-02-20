import yargs from "yargs";
import OpenSearchClient from "../../backend/src/projektiSearch/openSearchClient";
import fs from "fs";
import assert from "assert";

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
      assert(argv.index);
      const openSearchClient = new OpenSearchClient(argv.index as unknown as string);
      openSearchClient
        .getSettings()
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
      assert(argv.index);
      const openSearchClient = new OpenSearchClient(argv.index as unknown as string);
      const settings = fs.readFileSync(argv.outputFileName as string).toString("utf-8");
      openSearchClient
        .putSettings(settings)
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
      assert(argv.index);
      const openSearchClient = new OpenSearchClient(argv.index as unknown as string);
      openSearchClient
        .getMapping()
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
      const mapping = fs.readFileSync(argv.outputFileName as string).toString("utf-8");
      assert(argv.index);
      const openSearchClient = new OpenSearchClient(argv.index as unknown as string);
      openSearchClient
        .putMapping(mapping)
        .then((result) => {
          console.log("Finished\n" + JSON.stringify(result, null, 2));
        })
        .catch((err) => console.error(err));
    }
  )
  .strictCommands()
  .demandCommand(1)
  .help().argv;
