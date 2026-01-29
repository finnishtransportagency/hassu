export function nowWithOffset(): string {
  const d = new Date();

  const pad = (n: number) => String(n).padStart(2, "0");

  const tz = -d.getTimezoneOffset(); // minuutteina
  const sign = tz >= 0 ? "+" : "-";
  const hh = pad(Math.floor(Math.abs(tz) / 60));
  const mm = pad(Math.abs(tz) % 60);

  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds()) +
    sign +
    hh +
    ":" +
    mm
  );
}
