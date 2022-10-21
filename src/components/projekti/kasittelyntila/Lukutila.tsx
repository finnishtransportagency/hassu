import Section from "@components/layout/Section";
import React, { ReactElement } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

interface Props {
  projekti: ProjektiLisatiedolla;
}

// TODO: projektin tilan tietojen nayttaminen, nyt paaosin placeholdereita
function KasittelyntilaLukutila({ projekti }: Props): ReactElement {
  return (
    <>
      <p>
        Pääkäyttäjä lisää sivulle tietoa hallinnollisen käsittelyn tiloista, jotka ovat nähtävissä lukutilassa muille järjestelmän
        käyttäjille
      </p>
      <Section>
        <h5 className="vayla-small-title">Suunnitelman tila</h5>
        <p>Suunnitelman tilatieto siirtyy automaattisesti Projektivelhoon</p>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Suunnitelman tila</p>
          <p className="md:col-span-1 mb-0">{projekti.status}</p>
        </div>
      </Section>
      <Section>
        <h5 className="vayla-small-title">Hyväksymiskäsittelyn tila</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Ennakkotarkistus</p>
          <p className="vayla-label md:col-span-3">Ennakkoneuvottelu</p>
          <p className="md:col-span-1 mb-0">{"-"}</p>
          <p className="md:col-span-3 mb-0">{"-"}</p>
        </div>
        <div>
          <p className="vayla-label md:col-span-4">Hyväksymisesitys Traficomiin</p>
          <p className="md:col-span-4 mb-0">{"-"}</p>
        </div>
      </Section>
      <Section>
        <h5 className="vayla-small-title">Hyväksymispäätös</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Päätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Asiatunnus</p>
          <p className="md:col-span-1 mb-0">{projekti.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm || "-"}</p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.hyvaksymispaatos?.asianumero || "-"}</p>
        </div>
        <div>
          <p className="vayla-label md:col-span-4">Valitusten lukumäärä</p>
          <p className="md:col-span-4 mb-0">{"Kyllä/Ei, x kpl"}</p>
        </div>
      </Section>
      <Section>
        <h5 className="vayla-small-title">Lainvoima</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">Lainvoima alkaen</p>
          <p className="vayla-label md:col-span-3">Lainvoima päättyen</p>
          <p className="md:col-span-1 mb-0">{"-"}</p>
          <p className="md:col-span-3 mb-0">{"-"}</p>
        </div>
      </Section>
      <Section>
        <h5 className="vayla-small-title">Väylätoimitus</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Toimitus käynnistynyt</p>
          <p className="md:col-span-4 mb-0">{"-"}</p>
        </div>
        <h5 className="vayla-small-title">Liikenteelleluovutus tai ratasuunnitelman toteutusilmoitus</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Osaluovutus</p>
          <p className="md:col-span-4 mb-0">{"-"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-4">Kokoluovutus</p>
          <p className="md:col-span-4 mb-0">{"-"}</p>
        </div>
      </Section>
      <Section>
        <h5 className="vayla-small-title">Jatkopäätös</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">1. jatkopäätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Asiatunnus</p>
          <p className="md:col-span-1 mb-0">{projekti.kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm || "-"}</p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.ensimmainenJatkopaatos?.asianumero || "-"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="vayla-label md:col-span-1">2. jatkopäätöksen päivä</p>
          <p className="vayla-label md:col-span-3">Asiatunnus</p>
          <p className="md:col-span-1 mb-0">{projekti.kasittelynTila?.toinenJatkopaatos?.paatoksenPvm || "-"}</p>
          <p className="md:col-span-3 mb-0">{projekti.kasittelynTila?.toinenJatkopaatos?.asianumero || "-"}</p>
        </div>
      </Section>
      <Section>
        <h5 className="vayla-small-title">Lisätietoa käsittelyn tilasta</h5>
        <div className="grid grid-cols-1 md:grid-cols-4">
          <p className="md:col-span-4">-</p>
        </div>
      </Section>
    </>
  );
}

export default KasittelyntilaLukutila;
