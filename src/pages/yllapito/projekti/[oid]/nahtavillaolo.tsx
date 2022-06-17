import React, { ReactElement } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import Notification, { NotificationType } from "@components/notification/Notification";
import Tabs from "@components/layout/tabs/Tabs";
import KuulutuksenTiedot from "@components/projekti/nahtavillaolo/kuulutuksentiedot/KuulutuksenTiedot";
import NahtavilleAsetettavatAineistot from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/NahtavilleAsetettavatAineistot";
import { setupLambdaMonitoring } from "backend/src/aws/monitoring";
import { ViranomaisVastaanottajaInput } from "@services/api";
import { GetServerSideProps } from "next";
import { GetParameterResult } from "aws-sdk/clients/ssm";
import log from "loglevel";

export default function Nahtavillaolo({
  setRouteLabels,
  kirjaamoOsoitteet,
}: PageProps & ServerSideProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);

  return (
    <ProjektiPageLayout title="Nähtävilläolovaihe">
      <Notification type={NotificationType.INFO} hideIcon>
        <div>
          <h3 className="vayla-small-title">Ohjeet</h3>
          <ul className="list-disc block pl-5">
            <li>
              Lisää nähtäville asetettavat aineistot sekä lausuntopyynnön lisäaineistot kuulutuksen ensimmäiseltä
              välilehdeltä.
            </li>
            <li>Siirry Kuulutuksen tiedot-välilehdelle täyttämään kuulutuksen perustiedot.</li>
            <li>
              Anna päivämäärä, jolloin suunnittelun nähtäville asettamisesta kuulutetaan. Projekti ja sen nähtävilläolon
              kuulutus julkaistaan samana päivänä Valtion liikenneväylien suunnittelu -palvelun kansalaispuolella.
            </li>
            <li>
              Muokkaa tai täydennä halutessasi tiivistetty sisällönkuvaus hankkeesta. Jos projektista tulee tehdä
              kuulutus suomen lisäksi toisella kielellä, eikä tälle ole kenttää, tarkista projektin tiedot -sivulta
              projektin kieliasetus.
            </li>
            <li>Valitse kuulutuksessa esitettävät yhteystiedot.</li>
            <li>Lähetä nähtäville asettamisen kuulutus projektipäällikölle hyväksyttäväksi.</li>
            <li>
              {
                "Projekti näytetään kuulutuspäivästä lasketun määräajan jälkeen palvelun julkisella puolella 'Hyväksyntämenettelyssä' -olevana."
              }
            </li>
          </ul>
        </div>
      </Notification>
      <Tabs
        tabStyle="Underlined"
        defaultValue={0}
        tabs={[
          { label: "Nähtäville asetettavat aineistot", content: <NahtavilleAsetettavatAineistot /> },
          { label: "Kuulutuksen tiedot", content: <KuulutuksenTiedot kirjaamoOsoitteet={kirjaamoOsoitteet} /> },
        ]}
      />
    </ProjektiPageLayout>
  );
}

interface ServerSideProps {
  kirjaamoOsoitteet?: ViranomaisVastaanottajaInput[];
}

export const getServerSideProps: GetServerSideProps<ServerSideProps> = async () => {
  setupLambdaMonitoring();
  const { getSSM } = require("../../../../../backend/src/aws/client");
  const parameterName = "/kirjaamoOsoitteet";
  let kirjaamoOsoitteet: ViranomaisVastaanottajaInput[] = [];
  try {
    const response: GetParameterResult = await getSSM().getParameter({ Name: parameterName }).promise();
    kirjaamoOsoitteet = response.Parameter?.Value ? JSON.parse(response.Parameter.Value) : [];
  } catch (e) {
    log.error(`Could not pass prop 'kirjaamoOsoitteet' to 'aloituskuulutus' page`, e);
  }

  return {
    props: { kirjaamoOsoitteet }, // will be passed to the page component as props
  };
};
