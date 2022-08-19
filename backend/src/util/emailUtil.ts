// eslint-disable-next-line no-useless-escape
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
export function isValidEmail(email: string): boolean {
  if (emailRegex.test(email)) {
    return true;
  }
  return false;
}
