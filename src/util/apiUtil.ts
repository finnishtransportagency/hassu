import { parameterStore } from "./parameterStore";

export async function getCredentials() {
  const username = (await parameterStore.getParameter("/" + process.env.INFRA_ENVIRONMENT + "/basicAuthenticationUsername")) || "";
  const password = (await parameterStore.getParameter("/" + process.env.INFRA_ENVIRONMENT + "/basicAuthenticationPassword")) || "";
  return { username, password };
}
