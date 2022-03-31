import React, { ReactElement } from "react";
import { styled } from "@mui/material/styles";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import VideoLabelIcon from "@mui/icons-material/VideoLabel";
import Gavel from "@mui/icons-material/Gavel";
import AccountBalance from "@mui/icons-material/AccountBalance";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import StartIcon from "@mui/icons-material/Start";
import StepConnector, { stepConnectorClasses } from "@mui/material/StepConnector";
import { StepIconProps } from "@mui/material/StepIcon";
import HassuLink from "@components/HassuLink";
interface Props {
  oid: string;
  activeStep: number;
  selectedStep: number;
  vertical?: true;
}
export default function ProjektiJulkinenStepper({ oid, activeStep, selectedStep, vertical }: Props): ReactElement {
  const HassuConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
      top: 22,
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        backgroundImage: "linear-gradient( 117deg, #009AE0, #0064AF)",
      },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        backgroundImage: "linear-gradient(117deg, #009AE0, #009AE0)",
      },
    },
    [`& .${stepConnectorClasses.line}`]: {
      height: 5,
      border: 0,
      backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : "#eaeaf0",
      borderRadius: 1,
    },
  }));

  const HassuStepIconRoot = styled("div")<{
    ownerState: { completed?: boolean; active?: boolean };
  }>(({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[700] : "#ccc",
    zIndex: 1,
    color: "#fff",
    width: 50,
    height: 50,
    display: "flex",
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    ...(ownerState.active && {
      backgroundImage: "linear-gradient(117deg, #0064AF, #0064AF)",
      boxShadow: "0 4px 10px 0 rgba(0,0,0,.5)",
    }),
    ...(ownerState.completed && {
      backgroundImage: "linear-gradient(117deg, #009AE0, #009AE0)",
    }),
  }));

  function HassuStepIcon(props: StepIconProps) {
    const { active, completed, className } = props;

    const icons: { [index: string]: React.ReactElement } = {
      1: (
        <HassuLink href={`/suunnitelma/${oid}/aloituskuulutus`}>
          <StartIcon />
        </HassuLink>
      ),
      2: (
        <HassuLink href={`/suunnitelma/${oid}/suunnittelu`}>
          <ArchitectureIcon />
        </HassuLink>
      ),
      3: (
        <HassuLink href={`/suunnitelma/${oid}/nahtavillaolo`}>
          <VideoLabelIcon />
        </HassuLink>
      ),
      4: (
        <HassuLink href={`/suunnitelma/${oid}/hyvaksynnassa`}>
          <HourglassEmptyIcon />
        </HassuLink>
      ),
      5: (
        <HassuLink href={`/suunnitelma/${oid}/hyvaksymispaatos`}>
          <AccountBalance />
        </HassuLink>
      ),
      6: (
        <HassuLink href={`/suunnitelma/${oid}/lainvoima`}>
          <Gavel />
        </HassuLink>
      ),
    };

    return (
      <HassuStepIconRoot ownerState={{ completed, active }} className={className}>
        {icons[String(props.icon)]}
      </HassuStepIconRoot>
    );
  }

  const steps = [
    `${vertical ? "1." : ""} Suunnittelun käynnistäminen`,
    `${vertical ? "2." : ""} Suunnittelussa`,
    `${vertical ? "3." : ""} Suunnitteluaineisto nähtävillä`,
    `${vertical ? "4." : ""} Hyväksynnässä`,
    `${vertical ? "5." : ""} Päätös`,
    `${vertical ? "6." : ""} Lainvoimaisuus`,
  ];

  return (
    <>
      {!vertical && (
        <div>
          <Stepper alternativeLabel activeStep={activeStep} connector={<HassuConnector />}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  StepIconComponent={HassuStepIcon}
                  sx={selectedStep == index ? { textDecoration: "underline" } : {}}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </div>
      )}
      {vertical && (
        <div>
          <Stepper activeStep={activeStep} orientation="vertical" connector={<HassuConnector />}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  StepIconComponent={HassuStepIcon}
                  sx={selectedStep == index ? { textDecoration: "underline" } : {}}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </div>
      )}
    </>
  );
}
