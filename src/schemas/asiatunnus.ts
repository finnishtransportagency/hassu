import * as Yup from "yup";

const asiatunnusRegex = /Väylä\/[0-9]{4,5}\/([0-9]{2}(\.[0-9]{2}){2})\/[0-9]{4}/g;

export const asiatunnusSchema = Yup.string()
  .defined()
  .max(30)
  .matches(asiatunnusRegex, "Asiatunnus ei ole oikeaa muotoa, esim: Väylä/4825/06.02.03/2020");
