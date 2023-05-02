import { Scheduler } from "@aws-sdk/client-scheduler";
import { produce } from "../produce";

// Scheduler vaatii uudemman AWS SDK version kuin mitä Lambdassa on valmiiksi asennettuna. Schedulerin importointi on eriytetty tänne omaan
// tiedostoonsa, jotta se paketoitaisiin mukaan vain niihin lambdoihin, joissa sitä oikeasti tarvitaan
export const getScheduler = (): Scheduler => {
  return produce<Scheduler>("scheduler", () => new Scheduler({ region: "eu-west-1" }));
};
