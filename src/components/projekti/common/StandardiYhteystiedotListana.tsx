import { StandardiYhteystiedot, StandardiYhteystiedotInput, Projekti, Yhteystieto, YhteystietoInput } from "@services/api";
import React, { ReactElement } from "react";
import replace from "lodash/replace";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { standardiYhteystiedotYhteystiedoiksi, yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import useTranslation from "next-translate/useTranslation";

interface Props {
  standardiYhteystiedot: StandardiYhteystiedot | StandardiYhteystiedotInput | null | undefined;
  projekti: ProjektiLisatiedolla | Projekti | null | undefined;
  pakotaProjariTaiKunnanEdustaja?: boolean;
}

export default function StandardiYhteystiedotListana({
  standardiYhteystiedot,
  projekti,
  pakotaProjariTaiKunnanEdustaja,
}: Props): ReactElement {
  const { t } = useTranslation("common");
  const yhteystiedot: (Yhteystieto | YhteystietoInput)[] = standardiYhteystiedotYhteystiedoiksi(
    standardiYhteystiedot,
    projekti?.kayttoOikeudet,
    projekti?.suunnitteluSopimus,
    pakotaProjariTaiKunnanEdustaja
  );

  return (
    <React.Fragment>
      {yhteystiedot?.map((yhteystieto, index) => (
        <p style={{ margin: 0 }} key={index}>
          {replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto, t), "@", "[at]")}
        </p>
      ))}
    </React.Fragment>
  );
}
