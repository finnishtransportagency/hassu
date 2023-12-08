import { getSuomiFiClient } from "../src/viranomaispalvelutwsinterface/suomifi";
import express, { Request } from "express";
import fs from "fs";
import QueryString from "qs";

const app = express();
const port = 8080;
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
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

let cert = undefined;
let key = undefined;
if (process.argv.length > 4) {
  cert = fs.readFileSync(process.argv[3]).toString();
  key = fs.readFileSync(process.argv[4]).toString();
}

getSuomiFiClient({
  endpoint: `${endpoint}/${process.argv[2] ?? "tila"}`,
  privateKey: key,
  publicCertificate: cert,
  viranomaisTunnus: "Viranomaistunnus VLS",
  palveluTunnus: "Palvelutunnus VLS",
})
  .then((client) => {
    if (process.argv.length === 2 || process.argv[2] === "tila") {
      return client.rajapinnanTila();
    } else if (process.argv[2] === "kohde") {
      return client.lahetaInfoViesti({ hetu: "010120-3319", otsikko: "Viestin otsikko", sisalto: "Viestin sisältö" });
    } else if (process.argv[2] === "viesti") {
      return client.lahetaViesti({
        hetu: "010120-3319",
        otsikko: "Viestin otsikko",
        sisalto: "Viestin sisältö",
        tiedostot: [{ kuvaus: "Tiedoston kuvaus", nimi: "tiedosto.pdf", sisalto: fs.readFileSync(process.argv[3]) }],
      });
    } else if (process.argv[2] === "hae") {
      return client.haeAsiakas("010120-3319");
    } else {
      return new Promise((resolve, reject) => reject("Väärä toiminto!"));
    }
  })
  .then((response) => {
    console.log("Response", response);
    process.exit(0);
  })
  .catch((e) => {
    console.log("Error", e);
    process.exit(1);
  });
