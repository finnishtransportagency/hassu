import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { H4 } from "@components/Headings";
import { Grid } from "@mui/material";
import { ProjektinPerustiedot, TallennaHyvaksymisEsitysInput } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import { ReactElement } from "react";
import { useFormContext } from "react-hook-form";

export default function Laskutustiedot(props: Readonly<{ perustiedot: ProjektinPerustiedot }>): ReactElement {
  const { control } = useFormContext<TallennaHyvaksymisEsitysInput>();
  const { perustiedot } = props;

  const { t } = useTranslation("common");

  return (
    <>
      <H4 variant="h3">Laskutustiedot hyväksymismaksua varten</H4>
      <div>
        <Grid component="dl" container spacing={4} columns={2} sx={{ maxWidth: "700px", dt: { fontWeight: 700, marginBottom: 2 } }}>
          <Grid item xs={2} lg={1}>
            <dt>Suunnitelman nimi</dt>
            <dd>{perustiedot.suunnitelmanNimi ?? "-"}</dd>
          </Grid>
          <Grid item xs={2} lg={1}>
            <dt>Asiatunnus</dt>
            <dd>{perustiedot.asiatunnus ?? "-"}</dd>
          </Grid>
          <Grid item xs={2} lg={1}>
            <dt>Vastuuorganisaatio</dt>
            <dd>{perustiedot.vastuuorganisaatio ? t(`viranomainen.${perustiedot.vastuuorganisaatio}`) : "-"}</dd>
          </Grid>
          <Grid item xs={2} lg={1}>
            <dt>Y-tunnus</dt>
            <dd>{perustiedot.yTunnus ?? "-"}</dd>
          </Grid>
        </Grid>
      </div>
      <div>
        <Grid container spacing={4} columns={2} sx={{ maxWidth: "700px" }}>
          <Grid item xs={2} lg={1}>
            <TextFieldWithController
              label="OVT-tunnus"
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
              label="Viite"
              controllerProps={{ control, name: "muokattavaHyvaksymisEsitys.laskutustiedot.viitetieto" }}
              fullWidth
            />
          </Grid>
        </Grid>
      </div>
    </>
  );
}
