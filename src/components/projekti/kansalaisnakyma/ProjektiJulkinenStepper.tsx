import React, { ReactElement, useMemo } from "react";
import { styled } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step, { stepClasses, StepProps } from "@mui/material/Step";
import StepLabel, { stepLabelClasses } from "@mui/material/StepLabel";
import useTranslation from "next-translate/useTranslation";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector";
import { StepIconProps } from "@mui/material/StepIcon";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import HassuLink from "@components/HassuLink";
import { ProjektiJulkinen, Status } from "@services/api";
import { UrlObject } from "url";
import { projektiMeetsMinimumStatus } from "src/hooks/useIsOnAllowedProjektiRoute";
import { Translate } from "next-translate";

export type StepStatus =
  | Status.ALOITUSKUULUTUS
  | Status.SUUNNITTELU
  | Status.NAHTAVILLAOLO
  | Status.HYVAKSYMISMENETTELYSSA
  | Status.HYVAKSYTTY
  | Status.JATKOPAATOS_1
  | Status.JATKOPAATOS_2;

interface Props {
  projekti: ProjektiJulkinen;
  selectedStep: StepStatus;
  vertical?: true;
}

interface StepData {
  label: string;
  status: StepStatus;
  url: UrlObject;
  hidden?: (projekti: ProjektiJulkinen) => boolean;
}

const HassuStep = styled(Step)<StepProps>({
  [`&.${stepClasses.root} > a span:hover`]: {
    textDecoration: "underline",
    color: "#0064AF",
  },
  [`&.${stepClasses.horizontal}`]: {
    flex: "1 1 0px",
    width: "0",
  },
});

const HassuLabel = styled(StepLabel)({
  [`&.${stepLabelClasses.vertical}`]: {
    paddingTop: 0,
    paddingBottom: 0,
    [`& .${stepLabelClasses.iconContainer}`]: {
      paddingRight: "2rem",
    },
  },
  [`& .${stepLabelClasses.disabled}`]: {
    color: "#999999",
  },
  hyphens: "auto",
});

const HassuConnector = styled(StepConnector)({
  [`&.${stepConnectorClasses.root}`]: {
    left: "calc(-50%)",
    right: "calc(50%)",
    [`&.${stepConnectorClasses.vertical}`]: {
      marginLeft: 10,
      minHeight: 40,
    },
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: "linear-gradient( 117deg, #009AE1, #009AE1)",
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: "linear-gradient(117deg, #009AE1, #009AE1)",
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 10,
    border: 0,
    backgroundColor: "#D8D8D8",
    borderRadius: 1,
  },
  [`& .${stepConnectorClasses.lineVertical}`]: {
    width: 10,
    border: 0,
    backgroundColor: "#D8D8D8",
    borderRadius: 1,
    minHeight: 40,
  },
});

const HassuStepIconRoot = styled("div")<{
  ownerState: { completed?: boolean; active?: boolean; selected?: boolean };
}>(({ ownerState }) => ({
  backgroundColor: "#D8D8D8",
  zIndex: 1,
  color: "#fff",
  width: 30,
  height: 30,
  display: "flex",
  borderRadius: "50%",
  justifyContent: "center",
  alignItems: "center",
  ...((ownerState.active || ownerState.completed) && {
    backgroundImage: "linear-gradient(117deg, #009AE1, #009AE1)",
  }),
  ...(ownerState.selected && {
    boxShadow: "0 0 0 10px #009AE1",
    backgroundImage: "linear-gradient(117deg, #0064AF, #0064AF)",
  }),
}));

function HassuStepIcon(props: StepIconProps) {
  const { active, completed, className, property } = props;

  const selected = property === "selected";

  return <HassuStepIconRoot ownerState={{ completed, active, selected }} className={className} />;
}

function getPaatosStepData(projekti: ProjektiJulkinen, t: Translate): StepData {
  let pathname = `/suunnitelma/[oid]/hyvaksymispaatos`;
  let status = Status.HYVAKSYTTY;
  if (projekti.status === Status.JATKOPAATOS_1) {
    pathname = `/suunnitelma/[oid]/jatkopaatos1`;
    status = Status.JATKOPAATOS_1;
  } else if (projekti.status === Status.JATKOPAATOS_2) {
    pathname = `/suunnitelma/[oid]/jatkopaatos2`;
    status = Status.JATKOPAATOS_2;
  }
  return {
    label: t(`projekti-vaiheet.hyvaksytty`),
    status,
    url: { pathname, query: { oid: projekti.oid } },
  };
}

export default function ProjektiJulkinenStepper({ projekti, selectedStep, vertical }: Props): ReactElement {
  const { t } = useTranslation("projekti");

  const visibleSteps: StepData[] = useMemo(() => {
    const steps: StepData[] = [
      {
        label: t(`projekti-vaiheet.suunnittelun_kaynnistaminen`),
        status: Status.ALOITUSKUULUTUS,
        url: { pathname: "/suunnitelma/[oid]/aloituskuulutus", query: { oid: projekti.oid } },
      },
      {
        label: t(`projekti-vaiheet.suunnittelussa`),
        status: Status.SUUNNITTELU,
        url: { pathname: "/suunnitelma/[oid]/suunnittelu", query: { oid: projekti.oid } },
        hidden: (projekti) => !!projekti.vahainenMenettely,
      },
      {
        label: t(`projekti-vaiheet.suunnitelma_nahtavilla`),
        status: Status.NAHTAVILLAOLO,
        url: { pathname: "/suunnitelma/[oid]/nahtavillaolo", query: { oid: projekti.oid } },
      },
      {
        label: t(`projekti-vaiheet.hyvaksymismenettelyssa`),
        status: Status.HYVAKSYMISMENETTELYSSA,
        url: { pathname: "/suunnitelma/[oid]/hyvaksymismenettelyssa", query: { oid: projekti.oid } },
      },
      getPaatosStepData(projekti, t),
    ];
    return steps.filter((step) => !step.hidden || !step.hidden(projekti));
  }, [projekti, t]);

  const activeStep = useMemo(() => {
    let activeStepIndex = -1;
    visibleSteps.forEach((step, index) => {
      if (projektiMeetsMinimumStatus(projekti, step.status)) {
        activeStepIndex = index;
      }
    });
    return activeStepIndex;
  }, [projekti, visibleSteps]);

  const steps = useMemo(() => {
    const createStep = (step: StepData) => {
      return (
        <HassuStep key={step.label}>
          {projektiMeetsMinimumStatus(projekti, step.status) && (
            <HassuLink id={"sidenavi_" + step.status} href={step.url}>
              <HassuLabel
                componentsProps={{ label: { style: { fontWeight: selectedStep === step.status ? 700 : 400 } } }}
                StepIconComponent={HassuStepIcon}
                StepIconProps={selectedStep === step.status ? { property: "selected" } : {}}
              >
                {step.label}
              </HassuLabel>
            </HassuLink>
          )}
          {!projektiMeetsMinimumStatus(projekti, step.status) && (
            <HassuLabel
              componentsProps={{ label: { style: { fontWeight: selectedStep === step.status ? 700 : 400 } } }}
              StepIconComponent={HassuStepIcon}
              StepIconProps={selectedStep === step.status ? { property: "selected" } : {}}
            >
              {step.label}
            </HassuLabel>
          )}
        </HassuStep>
      );
    };
    return visibleSteps.map((step) => createStep(step));
  }, [projekti, selectedStep, visibleSteps]);

  return (
    <>
      {!vertical && (
        <div>
          <Stepper alternativeLabel orientation="horizontal" activeStep={activeStep} connector={<HassuConnector />}>
            {steps}
          </Stepper>
        </div>
      )}
      {vertical && (
        <div>
          <Accordion sx={{ border: "grey 1px solid" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
              <Typography>Navigoi vaiheita</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: "1rem", borderTop: "1px grey solid" }}>
              <Stepper activeStep={activeStep} orientation="vertical" connector={<HassuConnector />}>
                {steps}
              </Stepper>
            </AccordionDetails>
          </Accordion>
        </div>
      )}
    </>
  );
}
