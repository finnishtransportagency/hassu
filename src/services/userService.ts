import { api, Kayttaja } from "@services/api";

let authenticated = false;
let currentUser: Kayttaja | undefined;

async function getVaylaUser() {
  if (!authenticated) {
    currentUser = await api.getCurrentUser();
  }
  return currentUser;
}

async function logout() {
  authenticated = false;
  currentUser = undefined;
}

export { getVaylaUser, logout };
