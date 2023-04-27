import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { produce } from "../produce";

// Scheduler vaatii uudemman AWS SDK version kuin mitä Lambdassa on valmiiksi asennettuna. Schedulerin importointi on eriytetty tänne omaan
// tiedostoonsa, jotta se paketoitaisiin mukaan vain niihin lambdoihin, joissa sitä oikeasti tarvitaan
export const getScheduler = (): SchedulerClient => {
  return produce<SchedulerClient>("scheduler", () => new SchedulerClient({ region: "eu-west-1" }));
};
