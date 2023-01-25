import { Stack } from "@mui/system";
import React, { ReactNode } from "react";
import TietoaPalvelustaSideNavigation from "./TietoaPalvelustaSideNavigation";

type Props = {
  children?: ReactNode;
};

export default function TietoaPalvelustaPageLayout({ children }: Props) {
  return (
    <section>
      <div className="flex flex-col md:flex-row gap-8 mb-3">
        <div style={{ minWidth: "345px" }}>
          <TietoaPalvelustaSideNavigation />
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
