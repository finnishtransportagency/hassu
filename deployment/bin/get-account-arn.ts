/* tslint:disable:no-console */
import { GetCallerIdentityCommand, GetCallerIdentityCommandOutput, STSClient } from "@aws-sdk/client-sts";

process.env.AWS_SDK_LOAD_CONFIG = "true"; // to get region from config file

export const getAWSAccountId = async (): Promise<GetCallerIdentityCommandOutput> => {
  return await new STSClient({}).send(new GetCallerIdentityCommand({}));
};

getAWSAccountId().then((value) => {
  console.log(`${value.Account}/eu-west-1 ${value.Account}/us-east-1`);
});
