import { dummyData } from "./suunnitelmaMockData";

export function getVelhoSuunnitelmasByName(name: string) {
  return dummyData.filter((suunnitelma) => suunnitelma.name.toLowerCase() === name.toLowerCase());
}
