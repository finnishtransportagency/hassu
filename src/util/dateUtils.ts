import dayjs from "dayjs";

export const formatDate = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).format("DD.MM.YYYY");
};

export const formatDayOfWeek = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).format("dddd");
};

// TODO i18n, jos käytössä kansalaispuolella
export const formatDateTime = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).format("DD.MM.YYYY [klo] HH:mm");
};

export const isValidDate = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).isValid();
};

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