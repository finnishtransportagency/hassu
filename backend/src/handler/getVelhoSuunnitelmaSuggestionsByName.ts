import { dummyData } from "./suunnitelmaMockData";

export function getVelhoSuunnitelmaSuggestionsByName(name: string) {
  return dummyData.filter((suunnitelma) => suunnitelma?.name.toLowerCase().includes(name.toLowerCase()));
}
