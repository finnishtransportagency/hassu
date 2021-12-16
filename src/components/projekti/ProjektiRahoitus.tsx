import React, { ReactElement } from "react";
import RadioButton from "@components/form/RadioButton";

export default function ProjektiPerustiedot(): ReactElement {

    return (
        <>
            <h4 className="vayla-small-title">EU-rahoitus</h4>
            <p>Rahoittaako EU suunnitteluhanketta</p>
            <div>
                <RadioButton label="Kyllä" name="eu_rahoitus" value="true" id="eu_rahoitus_kylla"></RadioButton>
                <RadioButton label="Ei" name="eu_rahoitus" value="false" id="eu_rahoitus_ei"></RadioButton>
            </div>
        </>
    );
}
