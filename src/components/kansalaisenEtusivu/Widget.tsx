import React, { ComponentProps } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import Section, { SectionProps } from "@components/layout/Section2";

const Widget = styled(({ children, ...props }: SectionProps) => {
  return (
    <Section noDivider {...props}>
      {children}
    </Section>
  );
})<ComponentProps<typeof Section>>(() => {
  return sx({
    boxShadow: 1,
  });
});

export default Widget;
