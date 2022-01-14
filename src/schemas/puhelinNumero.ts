import * as Yup from "yup";

export const minPhoneLength = 10;
export const maxPhoneLength = 10;
export const agencyPhoneNumberRegex = `^029\\d*$`;

export const puhelinNumeroSchema = Yup.string()
  .required("Puhelinnumero on pakollinen")
  .matches(
    new RegExp(agencyPhoneNumberRegex),
    "Puhelinnumeron on oltava 029-alkuinen ja sen tulee sisältää vain numeroita"
  )
  .min(
    minPhoneLength,
    `Puhelinnumeron on oltava ${minPhoneLength}${
      minPhoneLength === maxPhoneLength ? "" : "-" + maxPhoneLength
    } merkkiä pitkä`
  )
  .max(
    maxPhoneLength,
    `Puhelinnumeron on oltava ${minPhoneLength}${
      minPhoneLength === maxPhoneLength ? "" : "-" + maxPhoneLength
    } merkkiä pitkä`
  );
