import dayjs from "dayjs";
import { parameters } from "../aws/parameters";
import { auditLog, log } from "../logger";

async function callKeycloak(url: URL, path: string, token: string, method = "GET") {
  url.pathname = path;
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
    },
    method,
  });
  if (method === "GET") {
    return await response.json();
  } else {
    return response.status;
  }
}

type User = { id: string; createdTimestamp: number };

export async function handleEvent() {
  const keycloakUrl = new URL(await parameters.getKeycloakPrivateDomain());
  keycloakUrl.pathname = "/keycloak/auth/realms/master/protocol/openid-connect/token";
  const details: Record<string, string> = {
    grant_type: "password",
    client_id: "security-admin-console",
    username: await parameters.getKeycloakUsername(),
    password: await parameters.getKeycloakPassword(),
  };
  const formBody = Object.keys(details)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(details[key]))
    .join("&");
  const response = await fetch(keycloakUrl.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    body: formBody,
  });
  let json = await response.json();
  const token = json["access_token"];
  if (token) {
    const client_id = await parameters.getKeycloakClientId();
    json = await callKeycloak(keycloakUrl, "/keycloak/auth/admin/realms/suomifi/clients", token);
    const id = json.find((client: { id: string; clientId: string }) => client.clientId === client_id).id;
    json = await callKeycloak(keycloakUrl, `/keycloak/auth/admin/realms/suomifi/clients/${id}/user-sessions`, token);
    const activeUsers: string[] = json.map((user: { userId: string }) => user.userId);
    log.info("Aktiiviset käyttäjät", { activeUsers });
    json = await callKeycloak(keycloakUrl, "/keycloak/auth/admin/realms/suomifi/users", token);
    const users: User[] = json.map((u: User) => {
      return { id: u.id, createdTimestamp: u.createdTimestamp };
    });
    log.info("Kaikki käyttäjät", { users });
    const now = dayjs();
    for (const user of users) {
      const removeDate = dayjs(user.createdTimestamp).add(1, "day");
      if (!activeUsers.includes(user.id) && now.isAfter(removeDate)) {
        log.info("Poistetaan käyttäjä " + user.id);
        const status = await callKeycloak(keycloakUrl, `/keycloak/auth/admin/realms/suomifi/users/${user.id}`, token, "DELETE");
        auditLog.info("Käyttäjä poistettu", { id: user.id, status });
      } else {
        log.info("Käyttäjää " + user.id + " ei poistettu");
      }
    }
  } else {
    log.error("Sisäänkirjautuminen Keycloak:iin epäonnistui");
  }
}
