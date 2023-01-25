import SideNavigation, { Route } from "@components/SideNavigation";
import { Stack } from "@mui/system";
import React, { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

const routes: Route[] = [
  { id: "tietoa_palvelusta", title: "Tietoa palvelusta", pathname: "/tietoa-palvelusta", requireExactMatch: true },
  { id: "tietoa_suunnittelusta", title: "Tietoa suunnittelusta", pathname: "/tietoa-palvelusta/tietoa-suunnittelusta" },
  { id: "yhteystiedot_ja_palaute", title: "Yhteystiedot ja palaute", pathname: "/tietoa-palvelusta/yhteystiedot-ja-palaute" },
  { id: "saavutettavuus", title: "Saavutettavuus", pathname: "/tietoa-palvelusta/saavutettavuus" },
];

export default function TietoaPalvelustaPageLayout({ children }: Props) {
  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8 mb-3">
        <div style={{ minWidth: "345px" }}>
          <SideNavigation routes={routes} />
        </div>
        <div className="grow">
          <Stack
            sx={{ marginBottom: { xs: 3, sm: 0 } }}
            alignItems="flex-start"
            justifyContent="space-between"
            direction={{ xs: "column", sm: "row" }}
            rowGap={0}
          >
            <h1>{"title"}</h1>
            {"contentAsideTitle"}
          </Stack>
          <h2>{"projekti?.velho?.nimi"}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}
