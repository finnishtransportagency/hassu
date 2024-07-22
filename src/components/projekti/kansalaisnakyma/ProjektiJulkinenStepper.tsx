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
import { Status } from "@services/api";
import { UrlObject } from "url";

interface Props {
  oid: string;
  activeStep: Status | null | undefined;
  selectedStep: Status;
  vertical?: true;
  projektiStatus: Status | null | undefined;
  vahainenMenettely?: boolean | null;
}

const HassuStep = styled(Step)<StepProps>({
  [`&.${stepClasses.root} > a span:hover`]: {
    textDecorationThickness: "2px !important",
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
    color: "#242222",
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
  ...(ownerState.completed && {
    "&:hover": { boxShadow: "0 0 0 10px #D8D8D8" },
  }),
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

const statusToPaatosLinkMap: Partial<Record<Status, string>> = {
  HYVAKSYTTY: `/suunnitelma/[oid]/hyvaksymispaatos`,
  JATKOPAATOS_1: `/suunnitelma/[oid]/jatkopaatos1`,
  JATKOPAATOS_2: `/suunnitelma/[oid]/jatkopaatos2`,
};

export default function ProjektiJulkinenStepper({
  oid,
  activeStep,
  selectedStep,
  vertical,
  projektiStatus,
  vahainenMenettely,
}: Props): ReactElement {
  const { t } = useTranslation("projekti");

  const paatosLink = (projektiStatus && statusToPaatosLinkMap[projektiStatus]) || statusToPaatosLinkMap[Status.HYVAKSYTTY];

  const steps = useMemo(() => {
    const allSteps = [
      {
        label: t(`projekti-vaiheet.suunnittelun_kaynnistaminen`),
        url: { pathname: `/suunnitelma/[oid]/aloituskuulutus`, query: { oid } },
        steps: [Status.ALOITUSKUULUTUS],
      },
      {
        label: t(`projekti-vaiheet.suunnittelussa`),
        url: { pathname: `/suunnitelma/[oid]/suunnittelu`, query: { oid } },
        steps: [Status.SUUNNITTELU],
      },
      {
        label: t(`projekti-vaiheet.suunnitelma_nahtavilla`),
        url: { pathname: `/suunnitelma/[oid]/nahtavillaolo`, query: { oid } },
        steps: [Status.NAHTAVILLAOLO],
      },
      {
        label: t(`projekti-vaiheet.hyvaksymismenettelyssa`),
        url: { pathname: `/suunnitelma/[oid]/hyvaksymismenettelyssa`, query: { oid } },
        steps: [Status.HYVAKSYMISMENETTELYSSA],
      },
      {
        label: t(`projekti-vaiheet.hyvaksytty`),
        url: { pathname: paatosLink, query: { oid } },
        steps: [Status.HYVAKSYTTY, Status.JATKOPAATOS_1, Status.JATKOPAATOS_2],
      },
    ];
    if (vahainenMenettely) {
      allSteps.splice(1, 1);
    }
    return allSteps;
  }, [oid, paatosLink, t, vahainenMenettely]);

  const activeStepIndex: number = useMemo(() => {
    if (!activeStep) return -1;
    const step = steps.find((step) => step.steps?.includes(activeStep));
    if (step) {
      return steps.indexOf(step);
    }
    return -1;
  }, [steps, activeStep]);

  const selectedStepIndex: number = useMemo(() => {
    const step = steps.find((step) => step.steps?.includes(selectedStep));
    if (step) {
      return steps.indexOf(step);
    }
    return -1;
  }, [steps, selectedStep]);

  const createStep = (step: { label: string; url: UrlObject }, index: number) => {
    return (
      <HassuStep key={step.label}>
        {index <= activeStepIndex && (
          <HassuLink id={"sidenavi_" + index} key={index} href={step.url}>
            <HassuLabel
              componentsProps={{ label: { style: { fontWeight: selectedStepIndex === index ? 700 : 400 } } }}
              StepIconComponent={HassuStepIcon}
              StepIconProps={selectedStepIndex === index ? { property: "selected" } : {}}
            >
              {step.label}
            </HassuLabel>
          </HassuLink>
        )}
        {index > activeStepIndex && (
          <HassuLabel
            componentsProps={{ label: { style: { fontWeight: selectedStepIndex === index ? 700 : 400 } } }}
            StepIconComponent={HassuStepIcon}
            StepIconProps={selectedStepIndex === index ? { property: "selected" } : {}}
          >
            {step.label}
          </HassuLabel>
        )}
      </HassuStep>
    );
  };

  return (
    <>
      {!vertical && (
        <div style={{ marginTop: "3.75rem" }}>
          <Stepper alternativeLabel orientation="horizontal" activeStep={activeStepIndex} connector={<HassuConnector />}>
            {steps.map((step, index) => createStep(step, index))}
          </Stepper>
        </div>
      )}
      {vertical && (
        <div>
          <Accordion sx={{ border: "grey 1px solid" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="stepper-accordion-content" id="stepper-accordion-header">
              <Typography>Navigoi vaiheita</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: "1rem", borderTop: "1px grey solid" }}>
              <Stepper activeStep={activeStepIndex} orientation="vertical" connector={<HassuConnector />}>
                {steps.map((label, index) => createStep(label, index))}
              </Stepper>
            </AccordionDetails>
          </Accordion>
        </div>
      )}
    </>
  );
}
