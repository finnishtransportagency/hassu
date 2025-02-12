export function isAorLTunnus(uid: string | undefined | null): boolean {
  if (uid) {
    return isATunnus(uid) || isLTunnus(uid);
  }
  return false;
}
export function isATunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^A[\d]+/)?.pop();
  }
  return false;
}
export function isLTunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^L[\d]+/)?.pop();
  }
  return false;
}
