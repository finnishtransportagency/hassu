import { createClientAsync, GetCompaniesResponse, ServiceClient } from "./service";

export type PrhConfig = {
  endpoint: string;
  apikey: string;
  palvelutunnus: string;
};


export type Options = {
  endpoint: string;
  apiKey: string;
  palveluTunnus: string;
};


export type PrhClient = {
  haeYritykset: (ytunnus: string[]) => Promise<GetCompaniesResponse>;
  getSoapClient: () => ServiceClient;
};

export async function getPrhClient(options: Options): Promise<PrhClient> {
  const client = await createClientAsync(__dirname + "/service.wsdl", undefined, options.endpoint);
  if (options.apiKey) {
    client.addHttpHeader("x-api-key", options.apiKey);
  }
  client.addSoapHeader({
    "xrd:client": {
      attributes: { "id:objectType": "SUBSYSTEM" },
      "id:xRoadInstance": "FI",
      "id:memberClass": "GOV",
      "id:memberCode": "x",
      "id:subsystemCode": options.palveluTunnus,
    }
  });
  return {
    haeYritykset: (ytunnus) => {
      return haeYritykset(client, ytunnus, options);
    },
    getSoapClient: () => {
      return client;
    },
  };
}

async function haeYritykset(client: ServiceClient, ytunnus: string[], options: Options): Promise<GetCompaniesResponse> {
  const response = await client.GetCompaniesAsync({
    request: {
      companiesQuery: {
        BusinessIds: { string: ytunnus }
      }
    }
  });
  return response[0];
}
