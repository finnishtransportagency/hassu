import { SSM } from "@aws-sdk/client-ssm";
import { STS } from "@aws-sdk/client-sts";
import { getMmlClient } from "../src/mml/mmlClient";
const euWestSSMClient = new SSM({ region: "eu-west-1" });
const stsClient = new STS({ region: "eu-west-1" });
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
  stsClient.getCallerIdentity({}).then((resp) => {
    return { name: "UserId", value: resp.UserId?.split(":")[1] };
  }),
])
  .then((params) => {
    const ktjBaseUrl = params.find((p) => p.name === "KtjBaseUrl")?.value;
    const mmlApiKey = params.find((p) => p.name === "MmlApiKey")?.value;
    const ogcBaseUrl = params.find((p) => p.name === "OgcBaseUrl")?.value;
    const ogcApiKey = params.find((p) => p.name === "OgcApiKey")?.value;
    const uid = params.find((p) => p.name === "UserId")?.value;
    if (ktjBaseUrl && mmlApiKey && ogcBaseUrl && ogcApiKey && uid) {
      const client = getMmlClient({ endpoint: ktjBaseUrl, apiKey: mmlApiKey, ogcEndpoint: ogcBaseUrl, ogcApiKey });
      const debug = process.argv.includes("--debug");
      if (process.argv.includes("-y")) {
        return client.haeYhteystiedot(process.argv[process.argv.length - 1].split(","), uid, debug);
      } else if (process.argv.includes("-t")) {
        return client.haeTiekunnat(process.argv[process.argv.length - 1].split(","), uid, debug);
      } else if (process.argv.includes("-a")) {
        return client.haeYhteisalueet(process.argv[process.argv.length - 1].split(","), uid, debug);
      } else {
        return client.haeLainhuutotiedot(process.argv[process.argv.length - 1].split(","), uid, debug);
      }
    }
  })
  .then((response) => console.log("response: %o", response))
  .catch((e) => console.error(e));
