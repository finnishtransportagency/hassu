import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import Link from "next/link";
import { Suunnitelma } from "../API";
import log from "loglevel";
import { API, graphqlOperation } from "aws-amplify";
import { createSuunnitelma, updateSuunnitelma } from "../graphql/mutations";

export { AddEditSuunnitelma };

function AddEditSuunnitelma(props: any) {
  const suunnitelma = props?.suunnitelma;
  const isAddMode = !suunnitelma;
  const router = useRouter();

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Nimi on pakollinen kenttä"),
  });
  const formOptions = { resolver: yupResolver(validationSchema), defaultValues: {} };

  // set default form values if in edit mode
  if (!isAddMode) {
    const { password, confirmPassword, ...defaultValues } = suunnitelma;
    formOptions.defaultValues = defaultValues;
  }

  // get functions to build form with useForm() hook
  const { register, handleSubmit, formState } = useForm(formOptions);
  const { errors } = formState;

  function onSubmit(data: Suunnitelma) {
    return isAddMode ? doCreateSuunnitelma(data) : doUpdateSuunnitelma(data);
  }

  async function doCreateSuunnitelma(data: any) {
    try {
      log.info("Luodaan:", data);
      const result = await API.graphql(graphqlOperation(createSuunnitelma, { suunnitelma: data }));
      log.info("Luonnin tulos:", result);
      router.push(".");
    } catch (err) {
      log.error("error creating suunnitelma:", err);
    }
  }

  async function doUpdateSuunnitelma(data: any) {
    try {
      const dataToUpdate = { ...data };
      delete dataToUpdate.status;
      log.info("Päivitetään:", dataToUpdate);
      const result = await API.graphql(graphqlOperation(updateSuunnitelma, { suunnitelma: dataToUpdate }));
      log.info("Päivityksen tulos:", result);
      router.push("/yllapito");
    } catch (err) {
      log.error("error updating suunnitelma:", err);
      throw err;
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>{isAddMode ? "Luo uusi suunnitelma" : "Muokkaa suunnitelmaa"}</h1>
      <div className="form-row">
        <div className="form-group col-8">
          <label>Suunnitelman nimi</label>
          <input type="text" {...register("name")} className={`form-control ${errors.name ? "is-invalid" : ""}`} />
          <div className="invalid-feedback">{errors.name?.message}</div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group col-8">
          <label>Sijainti</label>
          <input
            type="text"
            {...register("location")}
            className={`form-control ${errors.location ? "is-invalid" : ""}`}
          />
          <div className="invalid-feedback">{errors.location?.message}</div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group col-5">
          <button type="submit" disabled={formState.isSubmitting} className="btn btn-primary mr-2">
            {formState.isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
            Save
          </button>
          <Link href="/yllapito">
            <a className="btn btn-link">Cancel</a>
          </Link>
        </div>
      </div>
    </form>
  );
}
