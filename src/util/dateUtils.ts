import dayjs from "dayjs";

export const formatDate = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).format("DD.MM.YYYY");
};

export const isValidDate = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).isValid();
};

export const formatDayOfWeek = (date: string | number | Date | dayjs.Dayjs | null | undefined) => {
  return dayjs(date).format("dddd"); //TODO translate
};
