import Button from "@components/button/Button";
import { H5 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { api } from "@services/api";
import { nyt } from "backend/src/util/dateUtil";
import { Tiedote } from "common/graphql/apiModel";
import dayjs from "dayjs";
import { Fragment, useCallback, useEffect } from "react";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

interface TiedoteListaProps {
  onEdit: (tiedote: Tiedote) => void;
  refreshTrigger?: number;
  tiedotteet: Tiedote[];
  setTiedotteet: (tiedotteet: Tiedote[]) => void;
}

export const getDynaaminenStatus = (tiedote: Tiedote): string => {
  if (!tiedote.aktiivinen) {
    return "EI_NAKYVILLA";
  }

  const alkaa = dayjs(tiedote.voimassaAlkaen).tz("Europe/Helsinki");
  const paattyy = tiedote.voimassaPaattyen ? dayjs(tiedote.voimassaPaattyen).tz("Europe/Helsinki") : null;
  const nykyhetki = nyt();

  if (paattyy && nykyhetki.isAfter(paattyy, "day")) {
    return "EI_NAKYVILLA";
  }

  if (nykyhetki.isBefore(alkaa, "day")) {
    return "AJASTETTU";
  }

  return "NAKYVILLA";
};

export default function TiedoteLista({ onEdit, refreshTrigger, tiedotteet, setTiedotteet }: TiedoteListaProps) {
  const { withLoadingSpinner } = useLoadingSpinner();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fi-FI");
  };

  const jarjestaTiedotteet = (tiedotteet: Tiedote[]): Tiedote[] => {
    return [...tiedotteet].sort((a, b) => {
      const aStatus = getDynaaminenStatus(a);
      const bStatus = getDynaaminenStatus(b);
      if (aStatus === "NAKYVILLA" && bStatus !== "NAKYVILLA") return -1;
      if (bStatus === "NAKYVILLA" && aStatus !== "NAKYVILLA") return 1;

      if (aStatus === "AJASTETTU" && bStatus === "EI_NAKYVILLA") return -1;
      if (bStatus === "AJASTETTU" && aStatus === "EI_NAKYVILLA") return 1;

      if (aStatus === "AJASTETTU" && bStatus === "AJASTETTU") {
        const aAlkaa = new Date(a.voimassaAlkaen);
        const bAlkaa = new Date(b.voimassaAlkaen);
        return aAlkaa.getTime() - bAlkaa.getTime();
      }

      const aMuokattu = new Date(a.muokattu || 0);
      const bMuokattu = new Date(b.muokattu || 0);
      return bMuokattu.getTime() - aMuokattu.getTime();
    });
  };

  const lataaTiedotteet = useCallback(async () => {
    withLoadingSpinner(
      (async () => {
        try {
          const result = await api.listaaTiedotteet();

          if (Array.isArray(result) && result.length > 0) {
          }
          const jarjestetytTiedotteet = jarjestaTiedotteet(result);
          setTiedotteet(jarjestetytTiedotteet);
        } catch (error) {
          console.error("Virhe tiedotteiden latauksessa:", error);
        }
      })()
    );
  }, [setTiedotteet, withLoadingSpinner]);

  useEffect(() => {
    lataaTiedotteet();
  }, [lataaTiedotteet]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      lataaTiedotteet();
    }
  }, [refreshTrigger, lataaTiedotteet]);

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
                {formatDate(tiedote.voimassaAlkaen)} - {tiedote.voimassaPaattyen ? formatDate(tiedote.voimassaPaattyen) : ""}
              </p>
              <div className={getStyleForRow(index)}>
                <div
                  style={{
                    borderStyle: "solid",
                    borderWidth: 1,
                    borderColor:
                      getDynaaminenStatus(tiedote) === "NAKYVILLA"
                        ? "#54AC54"
                        : getDynaaminenStatus(tiedote) === "AJASTETTU"
                        ? "#F0AD4E"
                        : "#999999",
                    width: "150px",
                    padding: 3,
                    paddingLeft: "2em",
                    paddingRight: "2em",
                    borderRadius: 5,
                    backgroundColor:
                      getDynaaminenStatus(tiedote) === "NAKYVILLA"
                        ? "#F5FFEF"
                        : getDynaaminenStatus(tiedote) === "AJASTETTU"
                        ? "#FFF6E8"
                        : "#F8F8F8",
                    textAlign: "center",
                  }}
                >
                  {getDynaaminenStatus(tiedote) === "NAKYVILLA"
                    ? "Näkyvillä"
                    : getDynaaminenStatus(tiedote) === "AJASTETTU"
                    ? "Ajastettu"
                    : "Ei näkyvillä"}
                </div>
              </div>
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
