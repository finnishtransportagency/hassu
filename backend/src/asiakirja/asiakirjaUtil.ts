export function formatDate(date: string | undefined | null): string {
  return date ? new Date(date).toLocaleDateString("fi") : "DD.MM.YYYY";
}
