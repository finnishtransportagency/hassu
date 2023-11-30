export type SuomiFiCognitoKayttaja = {
  sub: string;
  email_verified: string;
  email: string;
  username: string;
  given_name: string;
  family_name: string;
  ["custom:hetu"]: string;
  address?: Address
}

type Address = {
  street_address: string;
  locality: string;
  postal_code: string; 
}
