import dayjs, { ConfigType, Dayjs } from "dayjs";

export const isInPast = (date?: ConfigType, unit?: dayjs.OpUnitType | undefined): boolean => dayjs(date).isBefore(today(), unit);
export const isInFuture = (date?: ConfigType, unit?: dayjs.OpUnitType | undefined): boolean => dayjs(date).isAfter(today(), unit);

export const today = (): Dayjs => dayjs().startOf("day");

export const is2100Century = (date?: ConfigType): boolean => {
  const year = dayjs(date).year();
  return year >= 2000 && year < 2100;
};

export const formatDate = (date?: ConfigType): string => {
  return dayjs(date).format("DD.MM.YYYY");
};

export const formatDateLongWithTimeRange = (
  date: ConfigType,
  startTime: string,
  endTime: string,
  firstLetterCapitalized = true,
  locale = "fi"
): string => {
  const dateString = dayjs(date).locale(locale).format(`dddd DD.MM.YYYY [klo] [${startTime}-${endTime}]`);
  if (firstLetterCapitalized) {
    return dateString.charAt(0).toUpperCase() + dateString.slice(1);
  } else {
    return dateString;
  }
};

export const formatDayOfWeek = (date: ConfigType, locale: string | ILocale = "fi"): string => {
  return dayjs(date).locale(locale).format("dddd");
};

// TODO i18n, koska käytössä myös kansalaispuolella
export const formatDateTime = (date?: ConfigType): string => {
  return dayjs(date).format("DD.MM.YYYY [klo] HH:mm");
};

export const isValidDate = (date?: ConfigType): boolean => {
  return dayjs(date).isValid();
};

export function onTulevaisuudessa(date: string | null | undefined): boolean {
  if (!date) {
    return false;
  }
  const parsedDate = dayjs(date);
  return parsedDate.isAfter(dayjs());
}

export function examineJulkaisuPaiva(
  published: boolean,
  date: string | null | undefined
): { julkaisuPaiva: string | undefined; published: boolean } {
  let julkaisuPaiva: string | undefined;
  let visibleToClient: boolean | undefined;
  if (date) {
    const parsedDate = dayjs(date);
    if (date.length == 10) {
      julkaisuPaiva = parsedDate.format("DD.MM.YYYY");
    } else {
      julkaisuPaiva = parsedDate.format("DD.MM.YYYY HH:mm");
    }
    visibleToClient = published && parsedDate.isBefore(dayjs());
  } else {
    visibleToClient = false;
    julkaisuPaiva = undefined;
  }
  return { julkaisuPaiva, published: visibleToClient };
}
