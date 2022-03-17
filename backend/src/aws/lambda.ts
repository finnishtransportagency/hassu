import { InvocationType, InvokeCommand } from "@aws-sdk/client-lambda";
import { getLambdaClient } from "./clients";

export async function invokeLambda(
  functionName: string,
  synchronousCall: boolean,
  payload?: string
): Promise<string | undefined> {
  const lambdaClient = getLambdaClient();

  if (synchronousCall) {
    const output = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: InvocationType.RequestResponse,
        Payload: payload ? new TextEncoder().encode(payload) : undefined,
      })
    );
    return new TextDecoder().decode(output.Payload);
  } else {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: InvocationType.Event,
        Payload: payload ? new TextEncoder().encode(payload) : undefined,
      })
    );
  }
}
