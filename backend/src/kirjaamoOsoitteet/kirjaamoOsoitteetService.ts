import { GetParameterResult } from "@aws-sdk/client-ssm";
import log from "loglevel";
import { KirjaamoOsoite } from "../../../common/graphql/apiModel";
import { getSSM } from "../aws/client";

async function listKirjaamoOsoitteet(): Promise<KirjaamoOsoite[]> {
  const parameterName = "/kirjaamoOsoitteet";
  let kirjaamoOsoitteet: KirjaamoOsoite[] = [];
  try {
    const response: GetParameterResult = await getSSM().getParameter({ Name: parameterName });
    kirjaamoOsoitteet = response.Parameter?.Value ? JSON.parse(response.Parameter.Value) : [];
  } catch (e) {
    log.error(`Could not read or parse 'kirjaamoOsoitteet' from SSM`, e);
  }
  return kirjaamoOsoitteet;
}

export const kirjaamoOsoitteetService = { listKirjaamoOsoitteet };
