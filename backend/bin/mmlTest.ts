import { SSM } from "@aws-sdk/client-ssm";
import { STS } from "@aws-sdk/client-sts";
import { MmlKiinteisto, createMmlClient } from "../src/mml/mmlClient";
const euWestSSMClient = new SSM({ region: "eu-west-1" });
const stsClient = new STS({ region: "eu-west-1" });

function sort(kiinteistot: MmlKiinteisto[] | undefined) {
  kiinteistot?.sort((a, b) => {
    if (a.kiinteistotunnus && b.kiinteistotunnus) {
      return a.kiinteistotunnus.localeCompare(b.kiinteistotunnus);
    } else if (a.kayttooikeusyksikkotunnus && b.kayttooikeusyksikkotunnus) {
      return a.kayttooikeusyksikkotunnus.localeCompare(b.kayttooikeusyksikkotunnus);
    } else {
      return 0;
    }
  });
  return kiinteistot;
}

const parameterSuffix = process.argv.includes("--prod") ? "Prod" : "";
Promise.all([
  euWestSSMClient
    .getParameter({
      Name: "KtjBaseUrl" + parameterSuffix,
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  euWestSSMClient
    .getParameter({
      Name: "MmlApiKey" + parameterSuffix,
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  euWestSSMClient
    .getParameter({
      Name: "OgcBaseUrl" + parameterSuffix,
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  euWestSSMClient
    .getParameter({
      Name: "OgcApiKey" + parameterSuffix,
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
  stsClient.getCallerIdentity({}).then((resp) => {
    return { name: "UserId", value: resp.UserId?.split(":")[1] };
  }),
  euWestSSMClient
    .getParameter({
      Name: "OgcApiExamples" + parameterSuffix,
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
])
  .then((params) => {
    const ktjBaseUrl = params.find((p) => p.name === "KtjBaseUrl" + parameterSuffix)?.value;
    const mmlApiKey = params.find((p) => p.name === "MmlApiKey" + parameterSuffix)?.value;
    const ogcBaseUrl = params.find((p) => p.name === "OgcBaseUrl" + parameterSuffix)?.value;
    const ogcApiKey = params.find((p) => p.name === "OgcApiKey" + parameterSuffix)?.value;
    const ogcApiExamples = params.find((p) => p.name === "OgcApiExamples" + parameterSuffix)?.value;
    const uid = params.find((p) => p.name === "UserId")?.value;
    if (ktjBaseUrl && mmlApiKey && ogcBaseUrl && ogcApiKey && uid && ogcApiExamples) {
      const client = createMmlClient({ endpoint: ktjBaseUrl, apiKey: mmlApiKey, ogcEndpoint: ogcBaseUrl, ogcApiKey, ogcApiExamples });
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
  .then((response) => console.log("response: %s \n\nitems: %d", JSON.stringify(sort(response), null, "  "), response?.length))
  .catch((e) => console.error(e));
