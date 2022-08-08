import React, { ReactElement } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";
import Notification, { NotificationType } from "@components/notification/Notification";
import Tabs from "@components/layout/tabs/Tabs";
import KuulutuksenTiedot from "@components/projekti/hyvaksyminen/kuulutuksenTiedot/index";
import PaatosAineistot from "@components/projekti/hyvaksyminen/paatosAineistot/index";

export default function Hyvaksyminen({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);

  return (
    <ProjektiPageLayout title="Hyvaksymisvaihe">
      <Notification type={NotificationType.INFO} hideIcon>
        <div>
          <h3 className="vayla-small-title">Ohjeet</h3>
          <ul className="list-disc block pl-5">
            <li>INSERT TEXT HERE</li>
          </ul>
        </div>
      </Notification>
      <Tabs
        tabStyle="Underlined"
        defaultValue={0}
        tabs={[
          { label: "Päätös ja liitteenä oleva aineisto", content: <PaatosAineistot /> },
          { label: "Kuulutuksen tiedot", content: <KuulutuksenTiedot /> },
        ]}
      />
    </ProjektiPageLayout>
  );
}
