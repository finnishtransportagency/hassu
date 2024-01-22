import { SSM } from "@aws-sdk/client-ssm";
import { getMmlClient } from "../src/mml/mmlClient";
const euWestSSMClient = new SSM({ region: "eu-west-1" });
euWestSSMClient
  .getParameter({
    Name: "KtjBaseUrl",
    WithDecryption: true,
  })
  .catch((e) => {
    throw new Error("KtjBaseUrl not found");
  })
  .then((output) => {
    return output.Parameter?.Value;
  })
  .then(endpoint => {
    return euWestSSMClient
      .getParameter({
        Name: "MmlApiKey",
        WithDecryption: true,
      })
      .catch((e) => {
        throw new Error("MmlApiKey not found");
      })
      .then(apiKey => {
        if (apiKey.Parameter?.Value && endpoint) {
          const client = getMmlClient({ endpoint, apiKey: apiKey.Parameter.Value });
          return client.haeLainhuutotiedot(process.argv[2].split(","));
        }
      });
  })
  .then((response) => console.log("response: %o", response))
  .catch((e) => console.error(e));
