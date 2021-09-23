import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import Link from "next/link";
import { Suunnitelma } from "../graphql/apiModel";
import log from "loglevel";
import React, { FormEventHandler, useState } from "react";
import Autocomplete from "../components/Autocomplete";
import { createSuunnitelma, getVelhoSuunnitelmasByName, updateSuunnitelma } from "../graphql/api";

export { AddEditSuunnitelma };

function AddEditSuunnitelma(props: { suunnitelma: Suunnitelma }) {
  const suunnitelma = props?.suunnitelma;

  const isAddMode = !suunnitelma;
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchInvalid, setSearchInvalid] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState("");

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Nimi on pakollinen kenttä"),
  });
  const formOptions = { resolver: yupResolver(validationSchema), defaultValues: {} };

  // set default form values if in edit mode
  if (!isAddMode) {
    formOptions.defaultValues = suunnitelma;
  }

  // get functions to build form with useForm() hook
  const { register, handleSubmit, formState, setValue } = useForm(formOptions);
  const { errors } = formState;

  function onSubmit(data: Suunnitelma) {
    return isAddMode ? doCreateSuunnitelma(data) : doUpdateSuunnitelma(data);
  }

  async function doCreateSuunnitelma(data: any) {
    try {
      log.info("Luodaan:", data);
      const result = await createSuunnitelma(data);
      log.info("Luonnin tulos:", result);
      await router.push(".");
    } catch (err) {
      log.error("error creating suunnitelma:", err);
    }
  }

  async function doUpdateSuunnitelma(data: any) {
    try {
      const dataToUpdate = { ...data };
      delete dataToUpdate.status;
      log.info("Päivitetään:", dataToUpdate);
      const result = await updateSuunnitelma(dataToUpdate);
      log.info("Päivityksen tulos:", result);
      await router.push("/yllapito");
    } catch (err) {
      log.error("error updating suunnitelma:", err);
      throw err;
    }
  }

  const updateFormWithSuunnitelmaData: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setValue("name", "");
    setValue("location", "");
    const suunnitelmaList = await getVelhoSuunnitelmasByName(searchInput, true);
    if (suunnitelmaList.length > 1) {
      setSearchInvalid(true);
      setSearchErrorMessage("Haulla löytyi enemmän kuin yksi suunnitelma");
    } else if (suunnitelmaList.length === 1) {
      setSearchInvalid(false);
      const { name } = suunnitelmaList[0];
      setValue("name", name);
    } else {
      setSearchInvalid(true);
      setSearchErrorMessage("Haulla ei löytynyt suunnitelmia");
    }
  };

  const suunnitelmaSearchHandle = async (textInput: string) => {
    setSearchInput(textInput);
    return await getVelhoSuunnitelmasByName(searchInput);
  };

  return (
    <>
      <h1>{isAddMode ? "Luo uusi suunnitelma" : "Muokkaa suunnitelmaa"}</h1>
      {isAddMode && (
        <form onSubmit={updateFormWithSuunnitelmaData}>
          <div className="form-row">
            <div className="form-group col-8">
              <label>Hae suunnitelmaa</label>
              <Autocomplete
                value={searchInput}
                setValue={(value: string) => {
                  setSearchInvalid(false);
                  setSearchInput(value);
                }}
                suggestionHandler={suunnitelmaSearchHandle}
                itemText={(suunnitelmat: Suunnitelma[]) => suunnitelmat.map((s) => s.name)}
                invalid={searchInvalid}
                errorMessage={searchErrorMessage}
              />
            </div>
          </div>
          <div>
            <div>
              <div className="form-row">
                <div className="form-group col-8">
                  <button className="btn btn-primary mb-2">Hae Velhosta</button>
                  <small className="form-text text-muted">
                    Hakemalla Velhosta alla olevat lomake kentät täytetään haettavan suunnitelman tiedoilla.
                  </small>
                </div>
              </div>
            </div>
          </div>
          <hr />
        </form>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
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
              {formState.isSubmitting && <span className="spinner-border spinner-border-sm mr-1" />}
              Save
            </button>
            <Link href="/yllapito">
              <a className="btn btn-link">Cancel</a>
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
