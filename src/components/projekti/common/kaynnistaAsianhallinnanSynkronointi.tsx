import React, { ReactElement } from "react";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { ProjektiTestCommand } from "../../../../common/testUtil.dev";
import { naytaIntegroinninTila } from "@components/projekti/asianhallintaUtil";

type Props = {
  oid: string;
  asianhallintaSynkronointiTila: string | null | undefined;
  className?: string;
};

export default function kaynnistaAsianhallinnanSynkronointiNappi({ oid, asianhallintaSynkronointiTila, className }: Props): ReactElement {
  if (asianhallintaSynkronointiTila == "EI_TESTATTAVISSA") {
    return <>Projekti on luotu ennen asianhallintaintegraation toteutusta, joten asiakirjojen vienti automaattisesti ei ole mahdollista. Vie asiakirjat asianhallintaan käsin.</>;
  }
  return (
    <div className={className}>
      <ButtonFlatWithIcon
        icon="history"
        onClick={(e) => {
          e.preventDefault();
          window.location.assign(ProjektiTestCommand.oid(oid).kaynnistaAsianhallintasynkronointi());
        }}
      >
        Käynnistä asiakirjojen vienti asianhallintaan (TESTAAJILLE)
      </ButtonFlatWithIcon>
      {naytaIntegroinninTila(asianhallintaSynkronointiTila)}
    </div>
  );
}
