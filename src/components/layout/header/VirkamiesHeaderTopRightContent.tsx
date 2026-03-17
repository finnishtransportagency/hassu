import React, { FunctionComponent } from "react";
import useCurrentUser from "../../../hooks/useCurrentUser";
import dynamic from "next/dynamic";

const VirkamiesLogout = dynamic(() => import("./VirkamiesLogout"), { ssr: false });

const VirkamiesHeaderTopRightContent: FunctionComponent<{ mobile?: true }> = ({ mobile }) => {
  const { data: kayttaja } = useCurrentUser();
  const kayttajaNimi = kayttaja && kayttaja.etunimi && kayttaja.sukunimi && `${kayttaja.sukunimi}, ${kayttaja.etunimi}`;

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 py-5 md:py-0 vayla-paragraph">
      <span>{kayttajaNimi}</span>
      {!mobile && <VirkamiesLogout />}
    </div>
  );
};

export default VirkamiesHeaderTopRightContent;
