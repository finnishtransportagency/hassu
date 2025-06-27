import Button from "@components/button/Button";
import { H5 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { Tiedote } from "common/graphql/apiModel";
import { Fragment } from "react";

interface TiedoteListaProps {
  onEdit: (tiedote: Tiedote) => void;
}

export default function TiedoteLista({ onEdit }: TiedoteListaProps) {
  // tämä lainattu IlmoituksenVastaanottajat.tsx
  function getStyleForRow(index: number): string | undefined {
    if (index % 2 == 0) {
      return "vayla-table-even";
    }
    return "vayla-table-odd";
  }

  return (
    <>
      <H5 style={{ paddingTop: 60, paddingBottom: 60 }}>Tiedotteet</H5>
      <SectionContent>
        <div className="content grid grid-cols-5 mb-5">
          <p className="vayla-table-header">Otsikko</p>
          <p className="vayla-table-header">Kenelle näytetään</p>
          <p className="vayla-table-header">Voimassaoloaika</p>
          <p className="vayla-table-header">Status</p>
          <p className="vayla-table-header"></p>
          {tiedotteet.map((tiedote, index) => (
            <Fragment key={tiedote.id}>
              <p className={getStyleForRow(index)}>{tiedote.otsikko}</p>
              <p className={getStyleForRow(index)}>
                {Array.isArray(tiedote.kenelleNaytetaan) ? tiedote.kenelleNaytetaan.join(", ") : tiedote.kenelleNaytetaan}
              </p>
              <p className={getStyleForRow(index)}>
                {tiedote.voimassaAlkaen} {tiedote.voimassaPaattyen}
              </p>
              <p className={getStyleForRow(index)}>{tiedote.status}</p>
              <p className={getStyleForRow(index)}>
                <Button className="btn-small-primary" type="button" onClick={() => onEdit(tiedote)}>
                  Muokkaa
                </Button>
              </p>
            </Fragment>
          ))}
        </div>
      </SectionContent>
    </>
  );
}

//mock-data kehitystä varten, poistetaan kun voi tallentaa oikeita
const tiedotteet = [
  {
    __typename: "Tiedote" as const,
    id: "1",
    aktiivinen: true,
    otsikko: "Häiriöitä Suomi.fi-tunnistautumisessa",
    kenelleNaytetaan: ["Kansalainen / Virkamies"],
    tiedoteFI: "Tässä on tiedote",
    tiedoteSV: "Här är tiedote",
    tiedoteTyyppi: "Varoitus",
    voimassaAlkaen: "2025-06-26T00:00",
    voimassaPaattyen: "2025-06-26T23:59",
    status: "NAKYVILLA",
  },
  {
    __typename: "Tiedote" as const,
    id: "2",
    otsikko: "Hitautta järjestelmässä päivityksen vuoksi",
    kenelleNaytetaan: ["Virkamies"],
    tiedoteFI: "Tässä on tiedote",
    tiedoteSV: "Här är tiedote",
    tiedoteTyyppi: "Info",
    voimassaAlkaen: "2025-06-26T00:00",
    voimassaPaattyen: "2025-06-26T23:59",
    status: "AJASTETTU",
  },
  {
    __typename: "Tiedote" as const,
    id: "3",
    otsikko: "Järjestelmäpäivitys tulossa",
    kenelleNaytetaan: ["Kansalainen"],
    tiedoteFI: "Tässä on tiedote",
    tiedoteSV: "Här är tiedote",
    tiedoteTyyppi: "Varoitus",
    voimassaAlkaen: "2025-06-26T00:00",
    voimassaPaattyen: "2025-06-26T23:59",
    status: "EI_NAKYVILLA",
  },
];
