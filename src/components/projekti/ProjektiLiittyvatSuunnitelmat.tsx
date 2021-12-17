import React, { ReactElement } from "react";
import RadioButton from "@components/form/RadioButton";
import TextInput from "@components/form/TextInput";
import Button from "@components/button/Button";

export default function ProjektiPerustiedot(): ReactElement {

  return (
    <>
      <h4 className="vayla-small-title">Projektiin liittyvät suunnitelmat</h4>
          <p>Liittyykö projektiin muita voimassaolevia läkisääteisiä suunnitelmia</p>
          <div>
            <RadioButton label="Kyllä" name="liittyvia_suunnitelmia" value="true" id="liittyvia_suunnitelmia_kylla"></RadioButton>
            <RadioButton label="Ei" name="liittyvia_suunnitelmia" value="false" id="liittyvia_suunnitelmia_ei"></RadioButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 mb-3">
            <div className="lg:col-span-4">
              <TextInput
                label="Asiatunnus"
                value=""
                disabled
              />
            </div>
            <div className="lg:col-span-8">
              <TextInput
                label="Suunnitelman nimi"
                value=""
                disabled
              />
            </div>
          </div>
          <Button
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            Uusi rivi +
          </Button>
    </>
  );
}
