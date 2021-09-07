import { ExecException } from "child_process";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(name + "-ympäristömuuttujaa ei ole asetettu");
  }
  return value;
}

const env = getEnv("ENVIRONMENT");

function execShellCommand(cmd: string): Promise<string> {
  const exec = require("child_process").exec;
  return new Promise((resolve) => {
    exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        // tslint:disable-next-line:no-console
        console.warn(error);
      }
      resolve(stdout ? stdout.trim() : stderr);
    });
  });
}

const currentBranch = async () => execShellCommand("git rev-parse --abbrev-ref HEAD");

export const config = {
  env,
  currentBranch,
  appBucketName: "hassu-app-" + env,
};
