export type SuomiFiCognitoKayttaja = {
  sub: string;
  email_verified: string;
  email: string;
  username: string;
  given_name: string;
  family_name: string;
  ["custom:hetu"]: string;
  ["custom:lahiosoite"]: string;
  ["custom:postitoimipaikka"]: string;
  ["custom:postinumero"]: string;
  ["custom:ulkomainenlahiosoite"]: string;
  ["custom:ulkomainenkunta"]: string;
}
