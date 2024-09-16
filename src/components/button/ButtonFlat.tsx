import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/system";
import React, { ReactNode } from "react";

export const ButtonFlat = styled("button")(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  color: theme.palette.primary.dark,
  alignItems: "center",
  gap: theme.spacing(2),
  ":hover": {
    textDecoration: "underline",
  },
}));

type Props = React.ComponentProps<typeof ButtonFlat> & { icon?: IconProp; iconComponent?: ReactNode };

export const ButtonFlatWithIcon = ({ children, icon, iconComponent, ...props }: Props) => (
  <ButtonFlat {...props}>
    {children}
    {icon && <FontAwesomeIcon icon={icon} />}
    {iconComponent}
  </ButtonFlat>
);
