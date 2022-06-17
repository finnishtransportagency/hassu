import { GetParameterResult } from "aws-sdk/clients/ssm";
import log from "loglevel";
import { KirjaamoOsoite } from "../../../common/graphql/apiModel";
import { getSSM } from "../aws/client";
import { requirePermissionLuku } from "../user";

export async function listKirjaamoOsoitteet(): Promise<KirjaamoOsoite[]> {
  requirePermissionLuku();
  const parameterName = "/kirjaamoOsoitteet";
  let kirjaamoOsoitteet: KirjaamoOsoite[] = [];
  try {
    const response: GetParameterResult = await getSSM().getParameter({ Name: parameterName }).promise();
    kirjaamoOsoitteet = response.Parameter?.Value ? JSON.parse(response.Parameter.Value) : [];
  } catch (e) {
    log.error(`Could not read or parse 'kirjaamoOsoitteet' from SSM`, e);
  }
  return kirjaamoOsoitteet;
}
