/* tslint:disable:no-console */
import axios from "axios";

const url = process.env.VELHO_AUTH_URL!;
const username = process.env.VELHO_USERNAME!;
const password = process.env.VELHO_PASSWORD!;

const params = new URLSearchParams();
params.append("grant_type", "client_credentials");

interface ServerResponse {
  access_token: string;
}

axios
  .post<ServerResponse>(url, params, { auth: { username, password } })
  .then((response) => {
    console.log(response.data.access_token);
  })
  .catch((error) => {
    throw new Error("Authentikaatiokutsu epäonnistui! Tarkista ympäristömuuttujat: VELHO_AUTH_URL, VELHO_USERNAME, VELHO_PASSWORD");
  });
