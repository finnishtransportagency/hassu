import React, { ReactElement } from "react";
import ProjektiPageLayout from "@components/projekti/ProjektiPageLayout";
import { PageProps } from "@pages/_app";
import useProjektiBreadcrumbs from "src/hooks/useProjektiBreadcrumbs";

export default function Nahtavillaolo({ setRouteLabels }: PageProps): ReactElement {
  useProjektiBreadcrumbs(setRouteLabels);

  return (
    <ProjektiPageLayout title="Nähtävilläolovaihe">
      <div></div>
    </ProjektiPageLayout>
  );
}
