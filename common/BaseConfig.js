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

  static isPermanentEnvironment() {
    return ["dev", "test", "prod"].indexOf(BaseConfig.env) >= 0;
  }

  static isProductionEnvironment() {
    return "prod" === BaseConfig.env;
  }

  /**
   * Utility function to determine if there are AWS resources for the given ENVIRONMENT expected.
   */
  static isActuallyDeployedEnvironment() {
    return ["localstack", "feature"].indexOf(BaseConfig.env) < 0;
  }
}

module.exports = { BaseConfig, getEnv };
