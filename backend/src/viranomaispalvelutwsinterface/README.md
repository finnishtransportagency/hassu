# Suomi.fi viestit client

Client-koodi generoitu seuraavalla komennolla:

`npx wsdl-tsclient backend/src/viranomaispalvelutwsinterface/ViranomaispalvelutWSInterface.wsdl -o backend/src`

- Lisää export type [index.ts](./index.ts) tiedostoon
- Lisää attribuutit [Asiakas.ts](./definitions/Asiakas.ts) tiedostoon

### WSDL tiedoston päivitys

Lataa tiedosto selaimella osoitteesta https://qat.integraatiopalvelu.fi/Asiointitili/ViranomaispalvelutWSInterface?wsdl. Muuta tiedoston schemaLocation osoittamaan saman kansion xsd tiedostoon.

### Schema tiedoston päivitys

Lataa tiedosto selaimella osoitteesta https://qat.integraatiopalvelu.fi/Asiointitili/ViranomaispalvelutWSInterface?xsd=Viranomaispalvelut.xsd.
