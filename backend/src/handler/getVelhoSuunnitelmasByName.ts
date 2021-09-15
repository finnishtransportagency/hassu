import { dummyData } from "./suunnitelmaMockData";

export function getVelhoSuunnitelmasByName(name: string, requireExactMatch?: boolean) {
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
