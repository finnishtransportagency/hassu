import { SSM } from "@aws-sdk/client-ssm";

const ssm = new SSM({ region: "eu-west-1" });

async function getParameter(name: string) {
  return (await ssm.getParameter({ Name: name, WithDecryption: true })).Parameter?.Value;
}

export const parameterStore = { getParameter };
