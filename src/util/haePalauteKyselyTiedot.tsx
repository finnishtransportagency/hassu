import { today } from "hassu-common/util/dateUtils";
import dayjs from "dayjs";

function isValidPalautekyselyObject(obj: any): obj is { startDate: string; endDate: string; href: string } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.startDate === "string" &&
    typeof obj.endDate === "string" &&
    typeof obj.href === "string"
  );
}

export interface PalauteKyselyTiedot {
  href: string | undefined;
  startDate: string;
  endDate: string;
}

export interface PalauteKyselyAvoinna extends PalauteKyselyTiedot {
  href: string | undefined;
  isActive: boolean;
}

export const haePalauteKyselyTiedot = (): PalauteKyselyAvoinna => {
  const envParam = process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT;
  console.log(envParam);
  if (envParam) {
    try {
      const palauteKyselyTiedot = JSON.parse(envParam);
      if (isValidPalautekyselyObject(palauteKyselyTiedot)) {
        const NOW = today().format("YYYY-MM-DD");
        const isActive = !(dayjs(NOW).isBefore(palauteKyselyTiedot.startDate) || dayjs(NOW).isAfter(palauteKyselyTiedot.endDate));
        return {
          isActive,
          href: palauteKyselyTiedot.href,
          startDate: palauteKyselyTiedot.startDate,
          endDate: palauteKyselyTiedot.endDate,
        };
      }
    } catch (error) {
      // unable to parse envParam, return the 'default' values below
    }
  }
  return {
    isActive: false,
    href: undefined,
    startDate: "",
    endDate: "",
  };
};
