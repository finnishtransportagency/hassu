import { SSM } from "@aws-sdk/client-ssm";
import { createPrhClient, PrhConfig } from "../src/mml/prh/prh";
import { Omistaja } from "../src/mml/mmlClient";
import { STS } from "@aws-sdk/client-sts";

const euWestSSMClient = new SSM({ region: "eu-west-1" });
const stsClient = new STS({ region: "eu-west-1" });

Promise.all([
  stsClient.getCallerIdentity({}).then((resp) => {
    return { name: "UserId", value: resp.UserId?.split(":")[1] };
  }),
  euWestSSMClient
    .getParameter({
      Name: "PrhConfig",
      WithDecryption: true,
    })
    .then((param) => {
      return { name: param.Parameter?.Name, value: param.Parameter?.Value };
    }),
])
  .then((params) => {
    const config = params.find((p) => p.name === "PrhConfig")?.value;
    const uid = params.find((p) => p.name === "UserId")?.value;
    if (config && uid) {
      const partialCfg: Partial<PrhConfig> = {};
      config.split("\n").forEach((e) => {
        const v = e.split("=");
        partialCfg[v[0] as keyof PrhConfig] = v[1].trim();
      });
      const cfg = partialCfg as PrhConfig;
      if (process.argv.includes("--bastion")) {
        cfg.endpoint = "https://localhost:8443/vls/ytj";
      }
      return createPrhClient({
        endpoint: cfg.endpoint,
        username: cfg.username,
        password: cfg.password,
      }).then((client) => {
        if (process.argv.length <= 2) {
          return Promise.reject(new Error("Anna ytunnus parametrina!"));
        }
        return client.haeYritykset(process.argv[process.argv.length - 1].split(","), uid);
      });
    }
  })
  .then((response: Omistaja[] | undefined) => {
    console.log("Response", response);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error", e);
    process.exit(1);
  });
