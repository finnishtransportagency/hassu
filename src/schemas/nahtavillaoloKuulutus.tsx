import * as Yup from "yup";

export const nahtavillaoloKuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
});
