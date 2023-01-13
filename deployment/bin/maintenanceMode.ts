import assert from "assert";
import fetch from "node-fetch";
import { Config } from "../lib/config";
import Wafv2, { RegexPatternSetSummary } from "aws-sdk/clients/wafv2";
import Ssm from "aws-sdk/clients/ssm";
import { AWSError } from "aws-sdk/lib/error";

const waf = new Wafv2({ region: "us-east-1" });
const ssm = new Ssm({ region: "us-east-1" });

async function getSSMParameter(ssmParameterName: string): Promise<string | undefined> {
  try {
    const ssmResponse = await ssm.getParameter({ Name: ssmParameterName }).promise();
    return ssmResponse.Parameter?.Value;
  } catch (e) {
    if ((e as AWSError).code == "ParameterNotFound") {
      return undefined;
    } else {
      throw e;
    }
  }
}

async function getHostNameForEnv(env: string): Promise<string> {
  const ssmParameterName = "/" + env + "/FrontendDomainName";
  const ssmParameterValue = await getSSMParameter(ssmParameterName);
  if (ssmParameterValue) {
    return ssmParameterValue;
  } else {
    const hostname = process.env.FRONTEND_DOMAIN_NAME;
    console.log("SSM:stä ei löydy arvoa " + ssmParameterName + ":lle, joten käytetään hostnamea " + hostname);
    assert(hostname, "FRONTEND_DOMAIN_NAME ei ole asetettu");
    return hostname;
  }
}

async function setRegexPattern(hostname: string | undefined) {
  const patternSets = await waf.listRegexPatternSets({ Scope: "CLOUDFRONT", Limit: 20 }).promise();
  const envConfigName = Config.getEnvConfigName();
  const patternSet: RegexPatternSetSummary | undefined = patternSets.RegexPatternSets?.find((set) =>
    set.Name?.endsWith("-" + envConfigName)
  );
  if (!patternSet) {
    throw new Error("Ympäristölle ei löydy konfiguraatiota");
  }
  assert(patternSet.Name);
  assert(patternSet.Id);
  assert(patternSet.LockToken);
  const params: Wafv2.Types.UpdateRegexPatternSetRequest = {
    Scope: "CLOUDFRONT",
    Name: patternSet.Name,
    Id: patternSet.Id,
    LockToken: patternSet.LockToken,
    RegularExpressionList: [{ RegexString: "^" + hostname + "$" }],
  };
  await waf.updateRegexPatternSet(params).promise();
}

async function main() {
  assert(process.argv);
  const command = process.argv[process.argv.length - 1];
  const env = process.env.ENVIRONMENT;
  assert(env, "process.env.ENVIRONMENT pitää olla asetettu");
  const envConfig = Config.getEnvConfig();
  if (!envConfig.waf) {
    console.log("Ympäristöllä " + env + " ei ole WAF:ia, joten sitä ei voi asettaa huoltotilaan");
  }
  if (command == "set") {
    const hostname = await getHostNameForEnv(env);

    console.log("Asetetaan ympäristö '" + env + "' (" + hostname + ") huoltotilaan");
    await setRegexPattern(hostname);
    await waitForMaintenanceModeResult(hostname);
  } else if (command == "clear") {
    const hostname = await getHostNameForEnv(env);

    console.log("Poistetaan ympäristö '" + env + "' (" + hostname + ") huoltotilasta");
    await setRegexPattern("varattu-huoltokatkolle");
    await waitForMaintenanceModeOver(hostname);
  } else {
    console.log("Tuntematon komento " + command);
  }
}

async function waitForMaintenanceModeResult(hostname: string) {
  await waitForResponse(hostname, 503);
}

async function waitForMaintenanceModeOver(hostname: string) {
  await waitForResponse(hostname, undefined, 503);
}

async function waitForResponse(hostname: string, statuscode: number | undefined, notstatuscode?: number) {
  let retriesLeft = 60;
  while (retriesLeft-- > 0) {
    const response = await fetch("https://" + hostname);
    console.log(hostname + " status " + response.status);
    if (statuscode && response.status == statuscode) {
      return;
    }

    if (notstatuscode && response.status !== notstatuscode) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(hostname + " ei palauttanut statusta " + statuscode + " minuutin kuluessa!");
}

main()
  .then(() => console.log("Valmis!"))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
