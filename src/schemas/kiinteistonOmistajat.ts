import * as Yup from "yup";

const omistajaInput = Yup.object().required();

export const kiinteistonOmistajatSchema = Yup.object()
  .shape({
    oid: Yup.string().required(),
    muutOmistajat: Yup.array().of(omistajaInput).required(),
    poistettavatOmistajat: Yup.array().of(Yup.string().required()),
  })
  .required();
