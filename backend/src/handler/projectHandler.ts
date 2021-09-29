import { requireVaylaUser } from "../service/userService";
import { velho } from "../velho/velhoClient";

export function loadProjekti(oid: string) {
  requireVaylaUser();

  return velho.loadProject(oid);
}
