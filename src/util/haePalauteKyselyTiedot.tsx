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

export const haehardCodedPalauteKyselyTiedot = (): PalauteKyselyAvoinna => {
  const palauteKyselyTiedot = {
    startDate: "2025-04-01",
    endDate: "2025-05-11",
    href: "https://link.webropolsurveys.com/S/93F78A20D9689AB2",
  };
  return createPalauteKyselyAvoinna(palauteKyselyTiedot);
};

function createPalauteKyselyAvoinna(palauteKyselyTiedot: { startDate: string; endDate: string; href: string }) {
  const NOW = today().format("YYYY-MM-DD");
  const isActive = !(dayjs(NOW).isBefore(palauteKyselyTiedot.startDate) || dayjs(NOW).isAfter(palauteKyselyTiedot.endDate));
  return {
    isActive,
    href: palauteKyselyTiedot.href,
    startDate: palauteKyselyTiedot.startDate,
    endDate: palauteKyselyTiedot.endDate,
  };
}
