function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(name + "-ympäristömuuttujaa ei ole asetettu");
  }
  return value;
}

const env = getEnv("ENVIRONMENT");

export const config = {
  env,
  appBucketName: "hassu-app-" + env,
};
