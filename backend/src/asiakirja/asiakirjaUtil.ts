export function formatDate(date: string) {
  return date ? new Date(date).toLocaleDateString("fi") : "DD.MM.YYYY";
}
