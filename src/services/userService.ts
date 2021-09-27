import { getCurrentUser } from "../graphql/api";
import * as model from "../graphql/apiModel";

let authenticated = false;
let currentUser: model.Kayttaja | undefined;

async function getVaylaUser() {
  if (!authenticated) {
    currentUser = await getCurrentUser();
  }
  return currentUser;
}

async function logout() {
  authenticated = false;
  currentUser = undefined;
}

export { getVaylaUser, logout };
