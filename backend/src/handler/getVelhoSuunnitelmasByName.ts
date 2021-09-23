import { requireVaylaUser } from "../service/userService";
import { velho } from "../velho/velhoClient";

export function getVelhoSuunnitelmasByName(name: string, requireExactMatch?: boolean) {
  requireVaylaUser();

  return velho.searchProjects(name, requireExactMatch);
}
