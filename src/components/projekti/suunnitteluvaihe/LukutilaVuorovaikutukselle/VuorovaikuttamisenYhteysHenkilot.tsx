import Section from "@components/layout/Section2";
import { VuorovaikutusKierrosJulkaisu } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import React, { FunctionComponent } from "react";
import { yhteystietoKansalaiselleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { H3 } from "../../../Headings";

export const VuorovaikuttamisenYhteysHenkilot: FunctionComponent<{
  julkaisu: VuorovaikutusKierrosJulkaisu;
}> = ({ julkaisu }) => {
  const { t } = useTranslation("suunnittelu");

  const uniikitYhteystiedot = julkaisu.yhteystiedot?.reduce<Array<(typeof julkaisu.yhteystiedot)[0]>>(
    (uniikitTiedot, nykyinenYhteystieto) => {
      if (!nykyinenYhteystieto.puhelinnumero) {
        return [...uniikitTiedot, nykyinenYhteystieto];
      }
      const onkoJoListassa = uniikitTiedot.some((yhteystieto) => yhteystieto.puhelinnumero === nykyinenYhteystieto.puhelinnumero);
      if (onkoJoListassa) {
        return uniikitTiedot;
      }
      return [...uniikitTiedot, nykyinenYhteystieto];
    },
    []
  );

  return (
    <Section>
      <H3>Kutsussa esitettävät yhteyshenkilöt</H3>
      {uniikitYhteystiedot?.map((yhteystieto, index) => {
        return <p key={index}>{yhteystietoKansalaiselleTekstiksi("fi", yhteystieto, t)}</p>;
      })}
    </Section>
  );
};
