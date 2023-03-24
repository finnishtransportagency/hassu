import * as Yup from "yup";

export const nahtavillaoloAineistotSchema = Yup.object().shape({
  oid: Yup.string().required(),
});
