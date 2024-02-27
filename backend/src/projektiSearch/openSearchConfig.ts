export const openSearchConfig = {
  searchDomain: process.env.SEARCH_DOMAIN,
  opensearchYllapitoIndex: "projekti-" + process.env.ENVIRONMENT + "-yllapito",
  opensearchJulkinenIndexPrefix: "projekti-" + process.env.ENVIRONMENT + "-julkinen-",
  opensearchIlmoitustauluSyoteIndex: "projekti-" + process.env.ENVIRONMENT + "-ilmoitustaulusyote",
  opensearchKiinteistonomistajaIndex: "kiinteistonomistaja-" + process.env.ENVIRONMENT,
  opensearchMuistuttajaIndex: "muistuttaja-" + process.env.ENVIRONMENT,
};
