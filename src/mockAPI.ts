import { Suunnitelma } from "./API";

var dummyData: Suunnitelma[] = [
  { __typename: "Suunnitelma", id: "1", name: "Akaan raakapuuterminaali", location: "Pirkanmaa" },
  { __typename: "Suunnitelma", id: "2", name: "Digirata", location: "Uusimaa" },
  { __typename: "Suunnitelma", id: "3", name: "E18 Haminan ohikulkutie", location: "Kymenlaakso" },
  { __typename: "Suunnitelma", id: "4", name: "E18 Hamina-Vaalimaa", location: "Kymenlaakso" },
  { __typename: "Suunnitelma", id: "5", name: "E18 Koskenkylä-Kotka", location: "Kymenlaakso, Uusimaa" },
  { __typename: "Suunnitelma", id: "6", name: "E18 Muurla-Lohja", location: "Uusimaa, Varsinais-Suomi" },
  { __typename: "Suunnitelma", id: "7", name: "E18 Turun kehätie", location: "Uusimaa, Varsinais-Suomi" },
];

export function filterSuunnitelmaIncludesName(name: string) {
  return dummyData.filter((suunnitelma) => suunnitelma.name.toLowerCase().includes(name.toLowerCase()));
}

export function filterSuunnitelmaByName(name: string) {
  return dummyData.filter((suunnitelma) => suunnitelma.name.toLowerCase() === name.toLowerCase());
}
