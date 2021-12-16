import React, { ReactElement } from "react";
import { Projekti } from "@services/api";
import styles from "@styles/projekti/ProjektiPerustiedot.module.css";
import RadioButton from "@components/form/RadioButton";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";

interface Props {
  projekti?: Projekti | null;
  kuntalista?: string[];
}

export default function ProjektiPerustiedot({ projekti, kuntalista }: Props): ReactElement {
    const kuntaOptions = kuntalista?.map((kunta)=>{
        return {label:kunta, value:kunta.toUpperCase()}
    });

  return (
    <>
      <h4 className="vayla-small-title">Suunnittelusopimus</h4>
          <p>Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke</p>
          <div>
            <RadioButton label="Kyllä" name="suunnittelusopimushanke" value="true" id="suunnittelusopimushanke_kylla"></RadioButton>
            <RadioButton label="Ei" name="suunnittelusopimushanke" value="false" id="suunnittelusopimushanke_ei"></RadioButton>
          </div>
          <div className={styles.cell}>
            <p>Kunnan projektipäällikön tiedot</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative even:bg-gray-lightest">
              <div className="lg:col-span-4">
                <Select
                  label="Kunta"
                  options={kuntaOptions ? kuntaOptions : [{label:"", value:""}]}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Etunimi"
                  value={projekti?.suunnitteluSopimus?.etunimi || ""}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Sukunimi"
                  value={projekti?.suunnitteluSopimus?.sukunimi || ""}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Puhelinnumero"

                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="Sähköposti"
                  value={projekti?.suunnitteluSopimus?.email?.split("@")[0] || ""}
                />
              </div>
              <div className="lg:col-span-4">
                <TextInput
                  label="&nbsp;"
                  value={projekti?.suunnitteluSopimus?.email?.split("@")[1] || ""}
                />
              </div>
            </div>
          </div>
    </>
  );
}
