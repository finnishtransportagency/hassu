function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(name + "-ympäristömuuttujaa ei ole asetettu");
  }
  return value;
}

class BaseConfig {
  static env = getEnv("ENVIRONMENT");
  static infraEnvironment = BaseConfig.isPermanentEnvironment() ? BaseConfig.env : "dev";

  constructor() {
    // tslint:disable-next-line:no-console
    console.log({ env: BaseConfig.env, infraEnvironment: BaseConfig.infraEnvironment });
  }

  static isPermanentEnvironment() {
    return ["dev", "test", "prod"].indexOf(BaseConfig.env) >= 0;
  }
}

module.exports = { BaseConfig, getEnv };
