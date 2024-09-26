import { chunkArray } from "../../database/chunkArray";
import { auditLog } from "../../logger";
import { Omistaja } from "../mmlClient";
import { Company } from "./service";
import { createClientAsync, ServiceClient } from "./service/client";

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
  haeYritykset: (ytunnus: string[]) => Promise<Omistaja[]>;
  getSoapClient?: () => ServiceClient;
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
      return haeYritykset(client, ytunnus);
    },
    getSoapClient: () => {
      return client;
    },
  };
}

async function haeYritykset(client: ServiceClient, ytunnus: string[]): Promise<Omistaja[]> {
  auditLog.info("PRH tietojen haku", { ytunnukset: ytunnus });
  const companies:Company[]  = [];
  for (const tunnukset of chunkArray(ytunnus, 1000)) {
    const response = await client.GetCompaniesAsync({
      request: {
        companiesQuery: {
          BusinessIds: { string: tunnukset }
        }
      }
    });
    if (response[0].response?.GetCompaniesResult?.Companies?.Company) {
      companies.push(...response[0].response.GetCompaniesResult.Companies.Company);
    }
  }
  return companies.map(c => {
      const o: Omistaja = {};
      o.ytunnus = c.BusinessId;
      o.nimi = c.TradeName?.Name;
      if (c.PostalAddress?.DomesticAddress?.PostalCodeActive) {
        const street = [c.PostalAddress.DomesticAddress.Street, c.PostalAddress.DomesticAddress.BuildingNumber, c.PostalAddress.DomesticAddress.Entrance, c.PostalAddress.DomesticAddress.ApartmentNumber].filter(a => a).join(" ");
        o.yhteystiedot = {
          postinumero: c.PostalAddress.DomesticAddress.PostalCode,
          jakeluosoite: street,
          paikkakunta: c.PostalAddress.DomesticAddress.City,
          maakoodi: "FI",
        };
      } else if (c.PostalAddress?.ForeignAddress?.Country?.PrimaryCode) {
        o.yhteystiedot = {
          postinumero: c.PostalAddress.ForeignAddress.AddressPart1,
          jakeluosoite: c.PostalAddress.ForeignAddress.AddressPart2,
          paikkakunta: c.PostalAddress.ForeignAddress.AddressPart3,
          maakoodi: c.PostalAddress.ForeignAddress.Country.PrimaryCode,
        };
      }
      return o;
  });
}
