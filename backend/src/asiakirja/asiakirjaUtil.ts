export function formatDate(date: string): string {
  return date ? new Date(date).toLocaleDateString("fi") : "DD.MM.YYYY";
}
