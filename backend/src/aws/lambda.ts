import { Lambda } from "@aws-sdk/client-lambda";
import { log } from "../logger";

export async function invokeLambda(functionName: string, asynchronousCall: boolean, payload?: string): Promise<string | undefined> {
  try {
    const lambda: Lambda = new Lambda({});
    if (asynchronousCall) {
      const output = await lambda.invoke({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(payload ?? "{}"),
      });
      const outputPayload = output.Payload;
      return new TextDecoder("utf-8").decode(outputPayload);
    } else {
      await lambda.invoke({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(payload ?? "{}"),
        InvocationType: "Event",
      });
    }
  } catch (e) {
    log.error("invokeLambda", e);
    throw e;
  }
}
