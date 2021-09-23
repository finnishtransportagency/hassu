import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

import { VelhoHakuTulos } from "../../graphql/apiModel";
import React, { FormEventHandler, useState } from "react";
import Autocomplete from "../../components/Autocomplete";
import { getVelhoSuunnitelmasByName } from "../../graphql/api";

export default function PerustaProjekti() {
  const [searchInput, setSearchInput] = useState("");
  const [searchInvalid, setSearchInvalid] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState("");

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Nimi on pakollinen kenttä"),
  });
  const formOptions = { resolver: yupResolver(validationSchema), defaultValues: {} };

  // get functions to build form with useForm() hook
  const { setValue } = useForm(formOptions);

  const updateFormWithSearchResults: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setValue("name", "");
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

  const projectSearchHandle = async (textInput: string) => {
    setSearchInput(textInput);
    return await getVelhoSuunnitelmasByName(searchInput);
  };

  return (
    <>
      <h1>Perusta uusi projekti</h1>
      <form onSubmit={updateFormWithSearchResults}>
        <div className="form-row">
          <div className="form-group col-12 form-row">
            <div className="col-3">
              <label>Suunnitelman / projektin nimi</label>
            </div>
            <div className="col-4">
              <Autocomplete
                value={searchInput}
                setValue={(value: string) => {
                  setSearchInvalid(false);
                  setSearchInput(value);
                }}
                suggestionHandler={projectSearchHandle}
                itemText={(searchResults: VelhoHakuTulos[]) => searchResults.map((item) => item.name || "")}
                invalid={searchInvalid}
                errorMessage={searchErrorMessage}
              />
            </div>
              <div className="col-4">
                <button className="btn btn-primary mb-2">Hae Velhosta</button>
              </div>
          </div>
        </div>
      </form>
    </>
  );
}
