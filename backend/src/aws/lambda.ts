import { Lambda } from "@aws-sdk/client-lambda";
import { log } from "../logger";

const lambda: Lambda = new Lambda({});

export async function invokeLambda(functionName: string, synchronousCall: boolean, payload?: string): Promise<string | undefined> {
  try {
    if (synchronousCall) {
      const output = await lambda.invoke({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(payload || "{}"),
      });
      const outputPayload = output.Payload;
      return new TextDecoder("utf-8").decode(outputPayload);
    } else {
      await lambda.invokeAsync({
        FunctionName: functionName,
        InvokeArgs: payload || "{}",
      });
    }
  } catch (e) {
    log.error("invokeLambda", e);
    throw e;
  }
}
