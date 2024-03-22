import * as Yup from "yup";

const omistajaInput = Yup.object().shape({}).required();

export const kiinteistonOmistajatSchema = Yup.object()
  .shape({
    oid: Yup.string().required(),
    suomifiOmistajat: Yup.array().of(omistajaInput).required(),
    muutOmistajat: Yup.array().of(omistajaInput).required(),
    uudetOmistajat: Yup.array()
      .of(
        Yup.object()
          .shape({
            kiinteistotunnus: Yup.string()
              .required("Kiinteistötunnus on pakollinen tieto")
              .test(
                "is-valid-kiinteistotunnus",
                "Anna kiinteistötunnus esitysmuodossa",
                (value) => !!value && /^\d{1,3}-\d{1,3}-\d{1,4}-\d{1,4}$/.test(value)
              ),
          })
          .required()
      )
      .required(),
  })
  .required();
