import { ProjektiKayttaja, StandardiYhteystiedot, StandardiYhteystiedotInput } from "@services/api";
import React, { ReactElement } from "react";
import capitalize from "lodash/capitalize";
import replace from "lodash/replace";
import { useProjekti } from "src/hooks/useProjekti";

interface Props {
  standardiYhteystiedot: StandardiYhteystiedot | StandardiYhteystiedotInput;
}

export default function StandardiYhteystiedotListana({ standardiYhteystiedot }: Props): ReactElement {
  const { data: projekti } = useProjekti();

  const vuorovaikutusYhteysHenkilot: ProjektiKayttaja[] = standardiYhteystiedot?.yhteysHenkilot
    ? standardiYhteystiedot?.yhteysHenkilot
        .map((hlo) => {
          const yhteysHenkiloTietoineen: ProjektiKayttaja | undefined = (projekti?.kayttoOikeudet || []).find(
            (ko) => ko.kayttajatunnus === hlo
          );
          if (!yhteysHenkiloTietoineen) {
            return {} as ProjektiKayttaja;
          }
          return yhteysHenkiloTietoineen as ProjektiKayttaja;
        })
        .filter((pk) => pk.nimi)
    : [];

  return (
    <React.Fragment>
      {standardiYhteystiedot?.yhteysTiedot?.map((yhteystieto, index) => (
        <p style={{ margin: 0 }} key={index}>
          {capitalize(yhteystieto.etunimi)} {capitalize(yhteystieto.sukunimi)}, puh. {yhteystieto.puhelinnumero},{" "}
          {yhteystieto?.sahkoposti ? replace(yhteystieto?.sahkoposti, "@", "[at]") : ""} ({yhteystieto.organisaatio})
        </p>
      ))}
      {vuorovaikutusYhteysHenkilot.map((yhteystieto, index) => (
        <p style={{ margin: 0 }} key={index}>
          {yhteystieto.nimi}, puh. {yhteystieto.puhelinnumero}, {yhteystieto.email ? replace(yhteystieto.email, "@", "[at]") : ""} (
          {yhteystieto.organisaatio})
        </p>
      ))}
    </React.Fragment>
  );
}
