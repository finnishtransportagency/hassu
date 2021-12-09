import { api, NykyinenKayttaja } from "@services/api";

let authenticated = false;
let currentUser: NykyinenKayttaja | undefined;

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
