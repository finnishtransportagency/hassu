import React, { ComponentProps } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import ContentSpacer, { HassuGaps } from "./ContentSpacer";

export type SectionProps = {
  noDivider?: boolean;
  marginBottom?: HassuGaps;
  marginTop?: HassuGaps;
} & ComponentProps<typeof ContentSpacer>;

const Section = styled(
  ({
    children,
    noDivider,
    gap = 7,
    as = "section",
    marginBottom: _marginBottom,
    marginTop: _marginTop,
    ...contentSpacerProps
  }: SectionProps) => (
    <>
      <ContentSpacer gap={gap} as={as} {...contentSpacerProps}>
        {children}
      </ContentSpacer>
      {!noDivider && <hr />}
    </>
  )
)(({ marginTop = 7, marginBottom = 12 }: SectionProps) =>
  sx({
    marginTop,
    marginBottom,
  })
);

export default Section;
