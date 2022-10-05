import dayjs, { ConfigType } from "dayjs";

export const isInPast = (date?: ConfigType, unit?: dayjs.OpUnitType | undefined) => dayjs(date).isBefore(today(), unit);
export const isInFuture = (date?: ConfigType, unit?: dayjs.OpUnitType | undefined) => dayjs(date).isAfter(today(), unit);

export const today = () => dayjs().startOf("day");

export const is2100Century = (date?: ConfigType) => {
  const year = dayjs(date).year();
  return year >= 2000 && year < 2100;
};

export const formatDate = (date?: ConfigType) => {
  return dayjs(date).format("DD.MM.YYYY");
};

export const formatDayOfWeek = (date?: ConfigType) => {
  return dayjs(date).format("dddd");
};

// TODO i18n, koska käytössä myös kansalaispuolella
export const formatDateTime = (date?: ConfigType) => {
  return dayjs(date).format("DD.MM.YYYY [klo] HH:mm");
};

export const isValidDate = (date?: ConfigType) => {
  return dayjs(date).isValid();
};

export function onTulevaisuudessa(date: string | null | undefined): boolean {
  if (!date) {
    return false;
  }
  let parsedDate = dayjs(date);
  return parsedDate.isAfter(dayjs());
}

export function examineJulkaisuPaiva(published: boolean, date: string | null | undefined) {
  let julkaisuPaiva: string | undefined;
  if (date) {
    let parsedDate = dayjs(date);
    if (date.length == 10) {
      julkaisuPaiva = parsedDate.format("DD.MM.YYYY");
    } else {
      julkaisuPaiva = parsedDate.format("DD.MM.YYYY HH:mm");
    }
    published = parsedDate.isBefore(dayjs());
  } else {
    published = false;
    julkaisuPaiva = undefined;
  }
  return { julkaisuPaiva, published };
}
