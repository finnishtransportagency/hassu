import assert from "assert";
import fetch from "node-fetch";
import { Config } from "../lib/config";
import { RegexPatternSetSummary, UpdateRegexPatternSetRequest, WAFV2 } from "@aws-sdk/client-wafv2";
import { ParameterNotFound, SSM } from "@aws-sdk/client-ssm";

const waf = new WAFV2({ region: "us-east-1" });
const ssm = new SSM({ region: "us-east-1" });

async function getSSMParameter(ssmParameterName: string): Promise<string | undefined> {
  try {
    const ssmResponse = await ssm.getParameter({ Name: ssmParameterName });
    return ssmResponse.Parameter?.Value;
  } catch (e) {
    if (e instanceof ParameterNotFound) {
      return undefined;
    } else {
      throw e;
    }
  }
}

async function getHostNamesForEnv(env: string): Promise<string[]> {
  const ssmParameterName = "/" + env + "/FrontendDomainName";
  const ssmParameterValue = await getSSMParameter(ssmParameterName);
  if (ssmParameterValue) {
    const hostNames = ssmParameterValue.split(",")?.map((hn) => hn.trim());
    if (!hostNames) {
      throw new Error(ssmParameterName + " ei löydy!");
    }
    return hostNames;
  } else {
    const hostnames = process.env.FRONTEND_DOMAIN_NAME;
    console.log("SSM:stä ei löydy arvoa " + ssmParameterName + ":lle, joten käytetään hostnamea " + hostnames);
    assert(hostnames, "FRONTEND_DOMAIN_NAME ei ole asetettu");
    return hostnames.split(",")?.map((hn) => hn.trim());
  }
}

async function setRegexPattern(hostnames: string[]) {
  const patternSets = await waf.listRegexPatternSets({ Scope: "CLOUDFRONT", Limit: 20 });
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
  const params: UpdateRegexPatternSetRequest = {
    Scope: "CLOUDFRONT",
    Name: patternSet.Name,
    Id: patternSet.Id,
    LockToken: patternSet.LockToken,
    RegularExpressionList: hostnames.map((hostname) => ({ RegexString: "^" + hostname + "$" })),
  };
  await waf.updateRegexPatternSet(params);
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
    const hostnames = await getHostNamesForEnv(env);
    if (!hostnames) {
      console.log("Ei hostnameja määritelty, poistutaan");
      return;
    }
    console.log("Asetetaan ympäristö '" + env + "' (" + hostnames + ") huoltotilaan");
    await setRegexPattern(hostnames);
    await waitForMaintenanceModeResult(hostnames);
  } else if (command == "clear") {
    const hostname = await getHostNamesForEnv(env);

    console.log("Poistetaan ympäristö '" + env + "' (" + hostname + ") huoltotilasta");
    await setRegexPattern(["varattu-huoltokatkolle"]);
    await waitForMaintenanceModeOver(hostname);
  } else {
    console.log("Tuntematon komento " + command);
  }
}

async function waitForMaintenanceModeResult(hostnames: string[]) {
  for (const hostname of hostnames) {
    await waitForResponse(hostname, 302, 200);
  }
}

async function waitForMaintenanceModeOver(hostnames: string[]) {
  for (const hostname of hostnames) {
    await waitForResponse(hostname, 200, 302);
  }
}

async function waitForResponse(hostname: string, statuscode: number | undefined, notstatuscode?: number) {
  let retriesLeft = 60;
  while (retriesLeft-- > 0) {
    const response = await fetch("https://" + hostname, { redirect: "manual" });
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
