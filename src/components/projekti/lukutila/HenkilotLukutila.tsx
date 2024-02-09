import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import Section from "@components/layout/Section";
import { KayttajaTyyppi, ProjektiKayttaja } from "@services/api";
import { formatNimi } from "../../../util/userUtil";

type Props = {
  kayttoOikeudet: ProjektiKayttaja[];
};
export default function HenkilotLukutila({ kayttoOikeudet }: Props) {
  return (
    <Section>
      <p>Projektiin voi lisätä henkilöitä tai muokata heidän oikeuksiaan, kun pääkäyttäjä on palauttanut projektin aktiiviseen tilaan.</p>
      <HassuGrid cols={{ xs: 1, md: 2, lg: 4, xl: 5 }}>
        {kayttoOikeudet.map((hlo) => {
          const tyyppi = getTyyppiText(hlo);
          return (
            <HassuGridItem key={hlo.kayttajatunnus}>
              <p className="vayla-label">{tyyppi}</p>
              <p className="mb-0">{hlo.organisaatio}</p>
              <p className="mb-0">{formatNimi(hlo)}</p>
              <p>{hlo.puhelinnumero}</p>
            </HassuGridItem>
          );
        })}
      </HassuGrid>
    </Section>
  );
}

function getTyyppiText(hlo: ProjektiKayttaja) {
  let text = "Muu henkilö";
  switch (hlo.tyyppi) {
    case KayttajaTyyppi.PROJEKTIPAALLIKKO:
      text = "Projektipäällikkö";
      break;
    case KayttajaTyyppi.VARAHENKILO:
      text = "Varahenkilö";
      break;
  }
  return text;
}
