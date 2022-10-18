import Notification, { NotificationType } from "@components/notification/Notification";
import { api } from "@services/api";
import Button from "@components/button/Button";
import React, { useState, ReactElement, ReactNode } from "react";
import { useProjekti } from "src/hooks/useProjekti";
import ProjektiSideNavigation from "./ProjektiSideNavigation";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import { Stack } from "@mui/material";
import HassuSpinner from "@components/HassuSpinner";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";

interface Props {
  children: ReactNode;
  title: string;
  showUpdateButton?: boolean;
}

export default function ProjektiPageLayout({ children, title, showUpdateButton }: Props): ReactElement {
  const { data: projekti, mutate: reloadProjekti } = useProjekti();
  const [loading, setLoading] = useState(false);

  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const uudelleenLataaProjekit = async () => {
    if (projekti?.oid) {
      try {
        setLoading(true);
        await api.synkronoiProjektiMuutoksetVelhosta(projekti.oid);
        await reloadProjekti();
        setLoading(false);
        showSuccessMessage("Projekti päivitetty");
      } catch (e) {
        setLoading(false);
        log.log("realoadProjekti Error", e);
        showErrorMessage("Päivittämisessä tapahtui virhe!");
      }
    }
  };

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-3">
        <div className="md:col-span-6 lg:col-span-4 xl:col-span-3">
          <ProjektiSideNavigation />
        </div>
        <div className="md:col-span-6 lg:col-span-8 xl:col-span-9">
          <Stack
            sx={{ marginBottom: { xs: 3, sm: 0 } }}
            alignItems="flex-start"
            justifyContent="space-between"
            direction={{ xs: "column", sm: "row" }}
            rowGap={0}
          >
            <h1>{title}</h1>
            {showUpdateButton && <Button onClick={uudelleenLataaProjekit}>Päivitä tiedot</Button>}
          </Stack>
          <h2>{projekti?.velho?.nimi || "-"}</h2>
          {projekti && projektiOnEpaaktiivinen(projekti) ? (
            <Notification type={NotificationType.INFO_GRAY}>
              Projekti on siirtynyt epäaktiiviseen tilaan. Projektille voi luoda jatkokuulutuksen, kun pääkäyttäjä on palauttanut projektin
              aktiiviseen tilaan. Voit seurata suunnitelman käsittelyä Käsittelyn tila -sivulta. Jos sinulla on kysyttävää, ota yhteys
              järjestelmän pääkäyttäjään.
            </Notification>
          ) : (
            !projekti?.nykyinenKayttaja.omaaMuokkausOikeuden && (
              <Notification type={NotificationType.WARN}>
                Sinulla on projektiin vain lukuoikeudet. Voit tarkastella projektin tietoja, mutta et voi tehdä siihen muutoksia. Jos
                tarvitset oikeudet projektiin, ota yhteys projektin projektipäällikköön.
              </Notification>
            )
          )}
          {children}
        </div>
        <HassuSpinner open={loading} />
      </div>
    </section>
  );
}
