import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import Section from "@components/layout/Section";
import { ProjektiKayttaja } from "@services/api";
import lowerCase from "lodash/lowerCase";

type Props = {
  kayttoOikeudet: ProjektiKayttaja[];
};
export default function HenkilotLukutila({ kayttoOikeudet }: Props) {
  return (
    <Section>
      <p>Projektiin voi lisätä henkilöitä tai muokata heidän oikeuksiaan, kun pääkäyttäjä on palauttanut projektin aktiiviseen tilaan.</p>
      <HassuGrid cols={{ xs: 1, md: 2, lg: 4, xl: 5 }}>
        {kayttoOikeudet.map((hlo) => {
          const tyyppi = lowerCase(hlo.tyyppi || "Muu henkilö");
          const label = tyyppi.charAt(0).toUpperCase() + tyyppi.slice(1);
          return (
            <HassuGridItem key={hlo.kayttajatunnus}>
              <p className="vayla-label">{label}</p>
              <p className="mb-0">{hlo.organisaatio}</p>
              <p className="mb-0">
                {hlo.sukunimi} {hlo.etunimi}
              </p>
              <p>{hlo.puhelinnumero}</p>
            </HassuGridItem>
          );
        })}
      </HassuGrid>
    </Section>
  );
}
