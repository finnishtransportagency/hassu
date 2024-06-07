import * as Yup from "yup";

export const maxPhoneLength = 15;
export const agencyPhoneNumberRegex = `^029`;
export const phoneNumberRegex = `^\\d*$`;

export const puhelinNumeroSchema = Yup.string()
  .required("Puhelinnumero on pakollinen")
  .matches(new RegExp(phoneNumberRegex), "Puhelinnumero voi sisältää vain numeroita")
  .max(maxPhoneLength, `Puhelinnumero voi olla maksimissaan ${maxPhoneLength} merkkiä pitkä`);

export const addAgencyNumberTests = (phoneSchema: typeof puhelinNumeroSchema) =>
  phoneSchema.matches(new RegExp(agencyPhoneNumberRegex), "Puhelinnumeron on oltava 029-alkuinen");
