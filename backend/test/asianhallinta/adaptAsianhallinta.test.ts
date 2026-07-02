// Contains code generated or recommended by Amazon Q
import { expect } from "chai";
import { getAsianhallintaSynchronizationStatus } from "../../src/projekti/adapter/common/adaptAsianhallinta";
import { AsianTila } from "hassu-common/graphql/apiModel";

const EVENT_ID = "event-123";
const MAANOMISTAJA_EVENT_ID = EVENT_ID + "_maanomistajaluettelo";

function synkronoitu() {
  return { dokumentit: [{ synkronointiTila: "SYNKRONOITU" as const }] };
}

function kesken() {
  return { dokumentit: [{ synkronointiTila: "VALMIS_VIENTIIN" as const }] };
}

function virhe(tila: "VIRHE" | "ASIAA_EI_LOYDY" | "ASIANHALLINTA_VAARASSA_TILASSA") {
  return { dokumentit: [{ synkronointiTila: tila }] };
}

describe("getAsianhallintaSynchronizationStatus", () => {
  it("palauttaa EI_TESTATTAVISSA kun synkronoinnit puuttuu", () => {
    expect(getAsianhallintaSynchronizationStatus(undefined, EVENT_ID)).to.eql(AsianTila.EI_TESTATTAVISSA);
  });

  it("palauttaa EI_TESTATTAVISSA kun asianhallintaEventId puuttuu", () => {
    expect(getAsianhallintaSynchronizationStatus({}, undefined)).to.eql(AsianTila.EI_TESTATTAVISSA);
  });

  it("palauttaa SYNKRONOITU kun päädokumentit synkronoitu eikä maanomistajaluetteloa", () => {
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: synkronoitu() }, EVENT_ID)).to.eql(AsianTila.SYNKRONOITU);
  });

  it("palauttaa undefined kun päädokumentit ei vielä synkronoitu", () => {
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: kesken() }, EVENT_ID)).to.be.undefined;
  });

  it("palauttaa virhetilan kun päädokumenteissa virhe", () => {
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: virhe("VIRHE") }, EVENT_ID)).to.eql(AsianTila.VIRHE);
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: virhe("ASIAA_EI_LOYDY") }, EVENT_ID)).to.eql(AsianTila.ASIAA_EI_LOYDY);
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: virhe("ASIANHALLINTA_VAARASSA_TILASSA") }, EVENT_ID)).to.eql(
      AsianTila.ASIANHALLINTA_VAARASSA_TILASSA
    );
  });

  it("palauttaa SYNKRONOITU kun sekä päädokumentit että maanomistajaluettelo synkronoitu", () => {
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: synkronoitu(), [MAANOMISTAJA_EVENT_ID]: synkronoitu() }, EVENT_ID)).to.eql(
      AsianTila.SYNKRONOITU
    );
  });

  it("palauttaa undefined kun päädokumentit synkronoitu mutta maanomistajaluettelo kesken", () => {
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: synkronoitu(), [MAANOMISTAJA_EVENT_ID]: kesken() }, EVENT_ID)).to.be
      .undefined;
  });

  it("palauttaa virhetilan kun maanomistajaluettelossa virhe vaikka päädokumentit synkronoitu", () => {
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: synkronoitu(), [MAANOMISTAJA_EVENT_ID]: virhe("VIRHE") }, EVENT_ID)).to.eql(
      AsianTila.VIRHE
    );
  });

  it("ei tarkista maanomistajaluetteloa jos sitä ei ole synkronoitu lainkaan", () => {
    // maanomistajaluettelo-eventtiä ei ole olemassa → SYNKRONOITU pelkillä päädokumenteilla
    expect(getAsianhallintaSynchronizationStatus({ [EVENT_ID]: synkronoitu() }, EVENT_ID)).to.eql(AsianTila.SYNKRONOITU);
  });
});
