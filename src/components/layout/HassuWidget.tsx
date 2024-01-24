import React, { ComponentProps } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import Section, { SectionProps } from "@components/layout/Section2";
import SectionContent from "@components/layout/SectionContent";
import styles from "@styles/kansalaisenProjekti/ProjektiJulkinenSideNavigation.module.css";
import Image from "next/image";

const WidgetOtsikko = styled("h4")(() => ({
  fontWeight: "bold",
  fontSize: 20,
}));

interface HassuWidgetProps {
  smallScreen?: boolean;
}

const HassuWidget = styled(({ children, title, smallScreen = false, ...props }: SectionProps & HassuWidgetProps) => {
  return (
    <Section noDivider {...props}>
      <div role="navigation" className={styles["side-nav"]}>
        {!smallScreen && <Image src="/rata_ja_tie_background.jpeg" alt="kuvituskuva" width="345" height="194"></Image>}
        <SectionContent className={styles["side-nav-content"]}>
          <WidgetOtsikko>{title}</WidgetOtsikko>
          {children}
        </SectionContent>
      </div>
    </Section>
  );
})<ComponentProps<typeof Section>>(() => {
  return sx({
    boxShadow: 0,
  });
});

export default HassuWidget;
