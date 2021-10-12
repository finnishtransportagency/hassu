import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import Link from "next/link";
import React, { FormEventHandler, useState } from "react";
import Autocomplete from "../components/Autocomplete";
import {api, Projekti, VelhoHakuTulos} from "@services/api";

export { AddEditSuunnitelma };

function AddEditSuunnitelma(props: { suunnitelma: Projekti }) {
  const suunnitelma = props?.suunnitelma;

  const isAddMode = !suunnitelma;
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

  function onSubmit(projekti: Projekti) {
    return api.tallennaProjekti(projekti);
  }

  const updateFormWithSuunnitelmaData: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setValue("name", "");
    setValue("location", "");
    const suunnitelmaList = await api.getVelhoSuunnitelmasByName(searchInput, true);
    if (suunnitelmaList.length > 1) {
      setSearchInvalid(true);
      setSearchErrorMessage("Haulla löytyi enemmän kuin yksi suunnitelma");
    } else if (suunnitelmaList.length === 1) {
      setSearchInvalid(false);
      const { nimi } = suunnitelmaList[0];
      setValue("name", nimi);
    } else {
      setSearchInvalid(true);
      setSearchErrorMessage("Haulla ei löytynyt suunnitelmia");
    }
  };

  const suunnitelmaSearchHandle = async (textInput: string): Promise<VelhoHakuTulos[]> => {
    setSearchInput(textInput);
    return await api.getVelhoSuunnitelmasByName(searchInput);
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
                itemText={(projektit: VelhoHakuTulos[]) => projektit.map((s) => s.nimi)}
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
