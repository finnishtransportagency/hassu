import Lambda from "aws-sdk/clients/lambda";
import { log } from "../logger";

const lambda = new Lambda();

export async function invokeLambda(functionName: string, synchronousCall: boolean, payload?: string): Promise<string | undefined> {
  try {
    if (synchronousCall) {
      const output = await lambda
        .invoke({
          FunctionName: functionName,
          Payload: payload || "{}",
        })
        .promise();
      const outputPayload = output.Payload;
      if (typeof outputPayload === "string") {
        return outputPayload;
      }
      return new TextDecoder().decode(outputPayload as Buffer);
    } else {
      await lambda
        .invokeAsync({
          FunctionName: functionName,
          InvokeArgs: payload || "{}",
        })
        .promise();
    }
  } catch (e) {
    log.error("invokeLambda", e);
    throw e;
  }
}
