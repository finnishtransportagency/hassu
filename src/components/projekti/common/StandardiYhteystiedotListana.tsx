import { Projekti, ProjektiKayttaja, StandardiYhteystiedot, StandardiYhteystiedotInput } from "@services/api";
import React, { ReactElement } from "react";
import replace from "lodash/replace";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import projektiKayttajaToYhteystieto, { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";

interface Props {
  standardiYhteystiedot: StandardiYhteystiedot | StandardiYhteystiedotInput | null | undefined;
  projekti: ProjektiLisatiedolla | Projekti | null | undefined;
}

export default function StandardiYhteystiedotListana({ standardiYhteystiedot, projekti }: Props): ReactElement {
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
        .filter((pk) => pk.etunimi && pk.sukunimi)
    : [];

  return (
    <React.Fragment>
      {vuorovaikutusYhteysHenkilot.map((yhteystieto, index) => (
        <p style={{ margin: 0 }} key={index}>
          {replace(
            yhteystietoVirkamiehelleTekstiksi(projektiKayttajaToYhteystieto(yhteystieto, projekti?.suunnitteluSopimus)),
            "@",
            "[at]"
          )}
        </p>
      ))}
      {standardiYhteystiedot?.yhteysTiedot?.map((yhteystieto, index) => (
        <p style={{ margin: 0 }} key={index}>
          {replace(yhteystietoVirkamiehelleTekstiksi(yhteystieto), "@", "[at]")}
        </p>
      ))}
    </React.Fragment>
  );
}
