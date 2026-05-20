// Contains code generated or recommended by Amazon Q
import {} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import dayjs from "dayjs";
import { faCheck, faEnvelope, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "@mui/material";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { LahetysTapa, TiedotettavanLahetyksenTila } from "@services/api";

interface TilaProps {
  pvm?: string | null;
  tila?: TiedotettavanLahetyksenTila | null;
  hasHetu?: boolean | null;
  lahetysTapa?: LahetysTapa | null;
}

export const tilaIcons: Record<TiedotettavanLahetyksenTila, IconProp> = {
  OK: faEnvelope,
  OK_ERI_KIINTEISTO_MUISTUTUS: faCheck,
  VIRHE: faCircleExclamation,
  VIRHE_ERI_KIINTEISTO_MUISTUTUS: faCircleExclamation,
};

export const tilaIconColors: Record<TiedotettavanLahetyksenTila, string> = {
  OK: "#207a43",
  OK_ERI_KIINTEISTO_MUISTUTUS: "#207a43",
  VIRHE: "#f10e0e",
  VIRHE_ERI_KIINTEISTO_MUISTUTUS: "#f10e0e",
};

export const tilaTooltipTitles: Record<TiedotettavanLahetyksenTila, string> = {
  OK: "Tiedotettu",
  OK_ERI_KIINTEISTO_MUISTUTUS: "Tiedotettu toisesta kiinteistöstä tai muistutuksesta",
  VIRHE: "Tiedottaminen epäonnistunut",
  VIRHE_ERI_KIINTEISTO_MUISTUTUS: "Tiedottaminen epäonnistunut",
};

export function PaivamaaraTila(props: Readonly<TilaProps>) {
  const pvm = props.pvm ? dayjs(props.pvm).format("DD.MM.YYYY HH:mm") : undefined;
  const hasHetuData = props.hasHetu != null;
  const vainOsoitetiedot = props.hasHetu === false;

  // Before sending
  if (!props.tila) {
    return <>{vainOsoitetiedot ? "-, vain osoitetiedot" : pvm ?? "-"}</>;
  }

  const icon = tilaIcons[props.tila];
  const iconColor = tilaIconColors[props.tila];
  const tooltipTitle = tilaTooltipTitles[props.tila];

  // Fallback: show old simple format when hasHetu/lahetysTapa data is not yet available
  if (!hasHetuData || !props.lahetysTapa) {
    return (
      <>
        {pvm ?? "-"}
        <Tooltip title={tooltipTitle}>
          <FontAwesomeIcon style={{ marginLeft: "8px" }} icon={icon} color={iconColor} />
        </Tooltip>
      </>
    );
  }

  const lahetystapaTeksti = props.lahetysTapa === LahetysTapa.VIESTI ? "Suomi.fi: viesti" : "Suomi.fi: kirje";

  return (
    <>
      <div>{pvm ?? "-"}</div>
      <div>
        {lahetystapaTeksti}{vainOsoitetiedot && ","}
        {vainOsoitetiedot ? (
          <div>
            vain osoitetiedot
            <Tooltip title={tooltipTitle}>
              <FontAwesomeIcon style={{ marginLeft: "8px" }} icon={icon} color={iconColor} />
            </Tooltip>
          </div>
        ) : (
          <Tooltip title={tooltipTitle}>
            <FontAwesomeIcon style={{ marginLeft: "8px" }} icon={icon} color={iconColor} />
          </Tooltip>
        )}
      </div>
    </>
  );
}
