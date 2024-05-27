import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H4 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import { Grid } from "@mui/material";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { ReactElement } from "react";
import { useFormContext } from "react-hook-form";

export default function Laskutustiedot(): ReactElement {
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();

  return (
    <SectionContent>
      <H4 variant="h3">Laskutustiedot hyväksymismaksua varten</H4>
      <div>
        <Grid container spacing={4} columns={2}>
          <Grid item xs={2} lg={1}>
            <TextFieldWithController
              label="OVT tunnus"
              controllerProps={{ control, name: "muokattavaHyvaksymisEsitys.laskutustiedot.ovtTunnus" }}
              fullWidth
            />
          </Grid>
          <Grid item xs={2} lg={1}>
            <TextFieldWithController
              label="Verkkolaskuoperaattorin välittäjätunnus"
              controllerProps={{ control, name: "muokattavaHyvaksymisEsitys.laskutustiedot.verkkolaskuoperaattorinTunnus" }}
              fullWidth
            />
          </Grid>
          <Grid item xs={2} lg={2}>
            <TextFieldWithController
              label="Viitetieto"
              controllerProps={{ control, name: "muokattavaHyvaksymisEsitys.laskutustiedot.viitetieto" }}
              fullWidth
            />
          </Grid>
        </Grid>
      </div>
    </SectionContent>
  );
}
