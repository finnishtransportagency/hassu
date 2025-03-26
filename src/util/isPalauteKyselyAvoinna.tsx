import { today } from "../../common/util/dateUtils";
import dayjs from "dayjs";

function hasRequiredFields(obj: any): obj is { startDate: string; endDate: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.startDate === 'string' &&
    typeof obj.endDate === 'string'
  );
}

/**
 * Reads dates from environment variable and returns boolean information about if 
 * PalauteKysely is available. It is open and available if the current date is between
 * start and end dates.
 * @returns boolean
 */
const isPalauteKyselyAvoinna = (): boolean => {
  const envParam = process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA;
  if (envParam) {
    const palauteKyselyAvoinnaDates = JSON.parse(envParam);
    if (hasRequiredFields(palauteKyselyAvoinnaDates)) {
      const NOW = today().format("YYYY-MM-DD");
      return !(dayjs(NOW).isBefore(palauteKyselyAvoinnaDates.startDate) || dayjs(NOW).isAfter(palauteKyselyAvoinnaDates.endDate));
    }
  }
  return false;
};

export default isPalauteKyselyAvoinna;
