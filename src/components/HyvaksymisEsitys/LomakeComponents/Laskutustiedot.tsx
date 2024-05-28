import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H4 } from "@components/Headings";
import { Grid } from "@mui/material";
import { TallennaHyvaksymisEsitysInput } from "@services/api";
import { ReactElement } from "react";
import { useFormContext } from "react-hook-form";

export default function Laskutustiedot(): ReactElement {
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();

  return (
    <>
      <H4 variant="h3">Laskutustiedot hyväksymismaksua varten</H4>
      <div>
        <Grid component="dl" container spacing={4} columns={2} sx={{ maxWidth: "700px", dt: { fontWeight: 700, marginBottom: 2 } }}>
          <Grid item xs={2} lg={1}>
            <dt>Suunnitelman nimi</dt>
            <dd>jokin nimi</dd>
          </Grid>
          <Grid item xs={2} lg={1}>
            <dt>Asiatunnus</dt>
            <dd>ASIA-123</dd>
          </Grid>
          <Grid item xs={2} lg={1}>
            <dt>Vastuuorganisaatio</dt>
            <dd>ORG</dd>
          </Grid>
          <Grid item xs={2} lg={1}>
            <dt>Y-tunnus</dt>
            <dd>Y1212</dd>
          </Grid>
        </Grid>
      </div>
      <div>
        <Grid container spacing={4} columns={2} sx={{ maxWidth: "700px" }}>
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
    </>
  );
}
