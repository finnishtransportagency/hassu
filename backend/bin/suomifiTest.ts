import { SSM } from "@aws-sdk/client-ssm";
import { SuomiFiConfig, getSuomiFiClient } from "../src/viranomaispalvelutwsinterface/suomifi";
import express, { Request } from "express";
import fs from "fs";
import QueryString from "qs";

const app = express();
const port = 8081;
const endpoint = `http://localhost:${port}`;

function logRequest(req: Request<{}, any, any, QueryString.ParsedQs, Record<string, any>>) {
  console.log("Headers:", req.headers);
  const chunks: string[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const payload = chunks.join("");
    console.log("Request: %o", payload);
  });
}

app.post("/tila", (req, res) => {
  logRequest(req);
  res.send(
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <asi:HaeTilaTietoResponse>
          <asi:HaeTilaTietoResult>
            <asi:TilaKoodi>
              <asi:TilaKoodi>0</asi:TilaKoodi>
              <asi:TilaKoodiKuvaus>OK</asi:TilaKoodiKuvaus>
              <asi:SanomaTunniste>sanomatunniste</asi:SanomaTunniste>
            </asi:TilaKoodi>
          </asi:HaeTilaTietoResult>
        </asi:HaeTilaTietoResponse>
      </soapenv:Body>
    </soapenv:Envelope>`
  );
});
app.post("/kohde", (req, res) => {
  logRequest(req);
  res.send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soap:Body xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <asi:LisaaKohteitaResponse xmlns:asi="http://www.suomi.fi/asiointitili">
          <asi:LisaaKohteitaResult>
            <asi:TilaKoodi>
              <asi:TilaKoodi>0</asi:TilaKoodi>
              <asi:TilaKoodiKuvaus>New messages created</asi:TilaKoodiKuvaus>
              <asi:SanomaTunniste>1524044968_211225566</asi:SanomaTunniste>
            </asi:TilaKoodi>
            <asi:KohdeMaara>1</asi:KohdeMaara>
            <asi:Kohteet>
              <asi:Kohde>
                <asi:ViranomaisTunniste>Vaka-1524-0449-6821-1225-566</asi:ViranomaisTunniste>
                <asi:Asiakas AsiakasTunnus="010120-3319" TunnusTyyppi="SSN">
                  <asi:AsiointitiliTunniste>574909</asi:AsiointitiliTunniste>
                  <asi:KohteenTila>200</asi:KohteenTila>
                  <asi:KohteenTilaKuvaus>Asia on tallennettuna ja näkyy asiakkaalle.</asi:KohteenTilaKuvaus>
                </asi:Asiakas>
              </asi:Kohde>
            </asi:Kohteet>
          </asi:LisaaKohteitaResult>
        </asi:LisaaKohteitaResponse>
      </soap:Body>
  </soapenv:Envelope>`);
});

app.post("/viesti", (req, res) => {
  logRequest(req);
  res.send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <LahetaViestiResponse xmlns="http://www.suomi.fi/asiointitili" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <LahetaViestiResult>
            <TilaKoodi>
              <TilaKoodi>202</TilaKoodi>
              <TilaKoodiKuvaus>Asia tallennettuna asiointitilipalvelun käsittelyjonoon, mutta se ei vielä näy asiakkaan asiointitilillä. </TilaKoodiKuvaus>
              <SanomaTunniste>1519043354_997202863</SanomaTunniste>
            </TilaKoodi>
          </LahetaViestiResult>
        </LahetaViestiResponse>
      </soapenv:Body>
    </soapenv:Envelope>`);
});

app.post("/hae", (req, res) => {
  logRequest(req);
  res.send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <asi:HaeAsiakkaitaResponse>
          <asi:HaeAsiakkaitaResult>
            <asi:TilaKoodi>
              <asi:TilaKoodi>0</asi:TilaKoodi>
              <asi:TilaKoodiKuvaus>Onnistui</asi:TilaKoodiKuvaus>
              <asi:SanomaTunniste>1524033786_837807286</asi:SanomaTunniste>
            </asi:TilaKoodi>
            <asi:Asiakkaat>
              <asi:Asiakas AsiakasTunnus="010101-0101" TunnusTyyppi="SSN">
                <asi:Tila>300</asi:Tila>
                <asi:TilaPvm>2018-02-22T11:00:41.143+02:00</asi:TilaPvm>
                <asi:TiliPassivoitu>0</asi:TiliPassivoitu>
              </asi:Asiakas>
              <asi:Asiakas AsiakasTunnus="010101-123N" TunnusTyyppi="SSN">
                <asi:Tila>300</asi:Tila>
                <asi:TilaPvm>2018-04-18T10:16:34.877+03:00</asi:TilaPvm>
                <asi:TiliPassivoitu>0</asi:TiliPassivoitu>
              </asi:Asiakas>
            </asi:Asiakkaat>
          </asi:HaeAsiakkaitaResult>
        </asi:HaeAsiakkaitaResponse>
      </soapenv:Body>
    </soapenv:Envelope>`);
});
app.post("/fault", (req, res) => {
  logRequest(req);
  res.status(500).send(`
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
      <soapenv:Header xmlns:asi="http://www.suomi.fi/asiointitili"/>
      <soapenv:Body xmlns:asi="http://www.suomi.fi/asiointitili">
        <soapenv:Fault>
          <faultcode>server</faultcode>
          <faultstring>temporary exception</faultstring>
        </soapenv:Fault>
      </soapenv:Body>
    </soapenv:Envelope>`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const euWestSSMClient = new SSM({ region: "eu-west-1" });
euWestSSMClient
  .getParameter({
    Name: "/dev/Certificate",
    WithDecryption: true,
  })
  .catch((e) => {
    throw new Error("Certificate not found");
  })
  .then((output) => {
    return output.Parameter?.Value;
  })
  .then((cert) => {
    return euWestSSMClient
      .getParameter({
        Name: "/dev/PrivateKey",
        WithDecryption: true,
      })
      .catch((e) => {
        throw new Error("PrivateKey not found");
      })
      .then((output) => {
        return output.Parameter?.Value;
      })
      .then((key) => {
        return euWestSSMClient
          .getParameter({
            Name: "/dev/SuomiFiConfig",
            WithDecryption: true,
          })
          .catch((e) => {
            throw new Error("SuomiFiConfig not found");
          })
          .then((output) => {
            return output.Parameter?.Value;
          })
          .then((config) => {
            if (config && key && cert) {
              const cfg: SuomiFiConfig = {};
              config.split("\n").forEach((e) => {
                const v = e.split("=");
                cfg[v[0] as keyof SuomiFiConfig] = v[1].trim();
              });
              return getSuomiFiClient({
                endpoint: `${cfg.endpoint ? cfg.endpoint : endpoint}/${process.argv[2] ?? "tila"}`,
                privateKey: process.argv.includes("--sign") ? key : undefined,
                publicCertificate: process.argv.includes("--sign") ? cert : undefined,
                viranomaisTunnus: cfg.viranomaistunnus ?? "Viranomaistunnus VLS",
                palveluTunnus: cfg.palvelutunnus ?? "Palvelutunnus VLS",
              }).then((client) => {
                if (process.argv.length === 2 || process.argv[2] === "tila") {
                  return client.rajapinnanTila();
                } else if (process.argv[2] === "kohde") {
                  return client.lahetaInfoViesti({
                    hetu: "010120-3319",
                    otsikko: "Viestin otsikko",
                    sisalto: "Viestin sisältö",
                    lahiosoite: "Lahiosoite 1",
                    nimi: "Matti Teppo",
                    postinumero: "00100",
                    postitoimipaikka: "Helsinki",
                    maa: "FI",
                  });
                } else if (process.argv[2] === "viesti") {
                  return client.lahetaViesti({
                    hetu: "010120-3319",
                    lahiosoite: "Lahiosoite 1",
                    nimi: "Matti Teppo",
                    postinumero: "00100",
                    postitoimipaikka: "Helsinki",
                    maa: "FI",
                    otsikko: "Viestin otsikko",
                    sisalto: "Viestin sisältö",
                    tiedosto: { kuvaus: "Tiedoston kuvaus", nimi: "tiedosto.pdf", sisalto: fs.readFileSync(process.argv[3]) },
                  });
                } else if (process.argv[2] === "hae") {
                  return client.haeAsiakas("010120-3319");
                } else if (process.argv[2] === "fault") {
                  return client.rajapinnanTila();
                } else {
                  return new Promise((_resolve, reject) => reject("Väärä toiminto!"));
                }
              });
            }
          });
      });
  })
  .then((response) => {
    console.log("Response", response);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error", e);
    process.exit(1);
  });
