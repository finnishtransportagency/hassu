import * as Yup from "yup";

const omistajaInput = Yup.object()
  .shape({ kiinteistotunnus: Yup.string().required("Kiinteistötunnus on pakollinen tieto") })
  .required();

export const kiinteistonOmistajatSchema = Yup.object()
  .shape({
    oid: Yup.string().required(),
    suomifiOmistajat: Yup.array().of(omistajaInput).required(),
    muutOmistajat: Yup.array().of(omistajaInput).required(),
    uudetOmistajat: Yup.array().of(omistajaInput.required()),
    poistettavatOmistajat: Yup.array().of(Yup.string().required()),
  })
  .required();
