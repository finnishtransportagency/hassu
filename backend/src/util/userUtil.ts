export function isAorL(uid: string): boolean {
  if (uid) {
    return isATunnus(uid) || isLTunnus(uid);
  }
  return false;
}

function isATunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^A[\d]+/)?.pop();
  }
  return false;
}

function isLTunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^L[\d]+/)?.pop();
  }
  return false;
}
