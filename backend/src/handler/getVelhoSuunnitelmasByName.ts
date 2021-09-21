import { dummyData } from "./suunnitelmaMockData";
import { requireVaylaUser } from "../service/userService";

export function getVelhoSuunnitelmasByName(name: string, requireExactMatch?: boolean) {
  requireVaylaUser();
  if (requireExactMatch) {
    const suunnitelmas = dummyData.filter((suunnitelma) => suunnitelma.name.toLowerCase() === name.toLowerCase());
    return suunnitelmas;
  } else {
    const suunnitelmaSuggestions = dummyData.filter((suunnitelma) =>
      suunnitelma?.name.toLowerCase().includes(name.toLowerCase())
    );
    return suunnitelmaSuggestions;
  }
}
