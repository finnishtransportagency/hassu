import { Lambda } from "@aws-sdk/client-lambda";
import { log } from "../logger";

const lambda: Lambda = new Lambda({});

export async function invokeLambda(functionName: string, synchronousCall: boolean, payload?: string): Promise<string | undefined> {
  try {
    if (synchronousCall) {
      log.info("payload", { payload });
      const output = await lambda.invoke({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(payload || "{}"),
      });
      log.info("output", { output });
      const outputPayload = output.Payload;
      log.info("outputPayload", { outputPayload });
      return new TextDecoder("utf-8").decode(outputPayload);
    } else {
      await lambda.invoke({
        FunctionName: functionName,
        Payload: new TextEncoder().encode(payload || "{}"),
        InvocationType: "Event",
      });
    }
  } catch (e) {
    log.error("invokeLambda", e);
    throw e;
  }
}
