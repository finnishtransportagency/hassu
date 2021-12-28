import { InvocationType, InvokeCommand } from "@aws-sdk/client-lambda";
import { getLambdaClient } from "./clients";

export async function invokeLambda(functionName: string, synchronousCall: boolean): Promise<string | undefined> {
  const lambdaClient = getLambdaClient();
  const output = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: synchronousCall ? InvocationType.RequestResponse : InvocationType.Event,
    })
  );
  if (synchronousCall) {
    return new TextDecoder().decode(output.Payload);
  }
}
