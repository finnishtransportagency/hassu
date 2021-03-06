import React, { ReactElement } from "react";
import { styled } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step, { stepClasses } from "@mui/material/Step";
import StepLabel, { stepLabelClasses } from "@mui/material/StepLabel";
import useTranslation from "next-translate/useTranslation";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector";
import { StepIconProps } from "@mui/material/StepIcon";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import HassuLink from "@components/HassuLink";

interface Props {
  oid: string;
  activeStep: number;
  selectedStep: number;
  vertical?: true;
}
export default function ProjektiJulkinenStepper({ oid, activeStep, selectedStep, vertical }: Props): ReactElement {

  const { t } = useTranslation("projekti");

  const HassuStep = styled(Step)(() => ({
    [`&.${stepClasses.root} > a span:hover`]: {
      textDecoration: "underline",
      color: "#0064AF",
    },
  }));

  const HassuLabel = styled(StepLabel)(() => ({
    [`&.${stepLabelClasses.vertical}`]: {
      paddingTop: 0,
      paddingBottom: 0,
      [`& .${stepLabelClasses.iconContainer}`]: {
        paddingRight: "2rem",
      },
    },
  }));

  const HassuConnector = styled(StepConnector)(() => ({
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
  }));

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

    return <HassuStepIconRoot ownerState={{ completed, active, selected }} className={className}></HassuStepIconRoot>;
  }

  const steps = [
    t(`projekti-vaiheet.suunnittelun_kaynnistaminen`),
    t(`projekti-vaiheet.suunnittelussa`),
    t(`projekti-vaiheet.suunnitteluaineisto_nahtavilla`),
    t(`projekti-vaiheet.hyvaksynnassa`),
    t(`projekti-vaiheet.paatos`),
    t(`projekti-vaiheet.lainvoimaisuus`),
  ];

  const links = [
    `/suunnitelma/${oid}/aloituskuulutus`,
    `/suunnitelma/${oid}/suunnittelu`,
    `/suunnitelma/${oid}/nahtavillaolo`,
    `/suunnitelma/${oid}/hyvaksynnassa`,
    `/suunnitelma/${oid}/hyvaksymispaatos`,
    `/suunnitelma/${oid}/lainvoima`,
  ];

  const createStep = (label: string, index: number) => {
    return (
      <HassuStep key={label}>
        {index <= activeStep && (
          <HassuLink key={index} href={links[index]}>
            <HassuLabel
              componentsProps={{ label: { style: { fontWeight: selectedStep === index ? 700 : 400 } } }}
              StepIconComponent={HassuStepIcon}
              StepIconProps={selectedStep === index ? { property: "selected" } : {}}
            >
              {label}
            </HassuLabel>
          </HassuLink>
        )}
        {index > activeStep && (
          <HassuLabel
            componentsProps={{ label: { style: { fontWeight: selectedStep === index ? 700 : 400 } } }}
            StepIconComponent={HassuStepIcon}
            StepIconProps={selectedStep === index ? { property: "selected" } : {}}
          >
            {label}
          </HassuLabel>
        )}
      </HassuStep>
    );
  };

  return (
    <>
      {!vertical && (
        <div>
          <Stepper alternativeLabel activeStep={activeStep} connector={<HassuConnector />}>
            {steps.map((label, index) => createStep(label, index))}
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
                {steps.map((label, index) => createStep(label, index))}
              </Stepper>
            </AccordionDetails>
          </Accordion>
        </div>
      )}
    </>
  );
}
