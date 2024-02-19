import convert from "convert-units";
import deburr from "lodash/deburr";

export function formatDate(date: string | undefined | null): string {
  return date ? new Date(date).toLocaleDateString("fi") : "DD.MM.YYYY";
}

export const linkExtractRegEx = new RegExp(/(https?:\/\/(?:www\.)?[a-z0-9.:].*?(?=\.?\s|\s|$|\.$))/g);

export function toPdfPoints(mm: number) {
  return convert(mm).from("mm").to("in") * 72;
}

export function convertPdfFileName(fileName: string) {
  return (
    deburr(fileName)
      .replace(/[^\w() -]/g, " ")
      .slice(0, 100) + ".pdf"
  );
}
