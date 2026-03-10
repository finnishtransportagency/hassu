class BaseConfig {
  static env = process.env.ENVIRONMENT || "ENVIRONMENT-ympäristömuuttujaa ei ole asetettu!";
  static infraEnvironment = BaseConfig.isPermanentEnvironment() ? BaseConfig.env : "dev";
  static projektiTableName = "Projekti-" + process.env.ENVIRONMENT;
  static lyhytOsoiteTableName = "Lyhytosoite-" + process.env.ENVIRONMENT;
  static internalBucketName = `hassu-${process.env.ENVIRONMENT}-internal`;
  static frontendPrefix = BaseConfig.isPermanentEnvironment() ? "/frontend" : "";

  static isPermanentEnvironment() {
    return ["dev", "test", "training", "prod"].indexOf(BaseConfig.env) >= 0;
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

module.exports = { BaseConfig };
