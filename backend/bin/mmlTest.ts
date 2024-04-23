import { SSM } from "@aws-sdk/client-ssm";
import { getMmlClient } from "../src/mml/mmlClient";
const euWestSSMClient = new SSM({ region: "eu-west-1" });

Promise.all([
  euWestSSMClient
    .getParameter({
      Name: "KtjBaseUrl",
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  euWestSSMClient
    .getParameter({
      Name: "MmlApiKey",
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  euWestSSMClient
    .getParameter({
      Name: "OgcBaseUrl",
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  euWestSSMClient
    .getParameter({
      Name: "OgcApiKey",
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
])
  .then((params) => {
    const ktjBaseUrl = params.find((p) => p.name === "KtjBaseUrl")?.value;
    const mmlApiKey = params.find((p) => p.name === "MmlApiKey")?.value;
    const ogcBaseUrl = params.find((p) => p.name === "OgcBaseUrl")?.value;
    const ogcApiKey = params.find((p) => p.name === "OgcApiKey")?.value;
    if (ktjBaseUrl && mmlApiKey && ogcBaseUrl && ogcApiKey) {
      const client = getMmlClient({ endpoint: ktjBaseUrl, apiKey: mmlApiKey, ogcEndpoint: ogcBaseUrl, ogcApiKey });
      const debug = process.argv.includes("--debug");
      if (process.argv.includes("-y")) {
        return client.haeYhteystiedot(process.argv[process.argv.length - 1].split(","), "tester", debug);
      } else if (process.argv.includes("-t")) {
        return client.haeTiekunnat(process.argv[process.argv.length - 1].split(","), "tester", debug);
      } else if (process.argv.includes("-a")) {
        return client.haeYhteisalueet(process.argv[process.argv.length - 1].split(","), "tester", debug);
      } else {
        return client.haeLainhuutotiedot(process.argv[process.argv.length - 1].split(","), "tester", debug);
      }
    }
  })
  .then((response) => console.log("response: %o", response))
  .catch((e) => console.error(e));
