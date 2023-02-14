export function formatDate(date: string | undefined | null): string {
  return date ? new Date(date).toLocaleDateString("fi") : "DD.MM.YYYY";
}

export const linkExtractRegEx = new RegExp(/(https?:\/\/(?:www\.)?[a-z0-9.:].*?(?=\.?\s|\s|$|\.$))/g);
