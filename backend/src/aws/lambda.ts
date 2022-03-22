import AWS from "aws-sdk";
import { log } from "../logger";

const lambda = new AWS.Lambda();

export async function invokeLambda(
  functionName: string,
  synchronousCall: boolean,
  payload?: string
): Promise<string | undefined> {
  try {
    if (synchronousCall) {
      const output = await lambda
        .invoke({
          FunctionName: functionName,
          Payload: payload || "{}",
        })
        .promise();
      return new TextDecoder().decode(output.Payload as Buffer);
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
