import { Readable } from "stream";

export async function streamToString(stream: Readable): Promise<string> {
  return (await streamToBuffer(stream)).toString("utf8");
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
