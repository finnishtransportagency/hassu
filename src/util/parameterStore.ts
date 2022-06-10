import AWS from "aws-sdk";

const ssm = new AWS.SSM();

async function getParameter(name: string) {
  return (await ssm.getParameter({ Name: name, WithDecryption: true }).promise()).Parameter?.Value;
}

export const parameterStore = { getParameter };
