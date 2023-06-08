import React, { ComponentProps } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import Section, { SectionProps } from "@components/layout/Section2";
import SectionContent from "@components/layout/SectionContent";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";

const WidgetOtsikko = styled("h3")(() => ({
  fontWeight: "bold",
  fontSize: 20,
  "::after": {
    content: '""',
    marginTop: 10,
    display: "block",
    width: 60,
    height: 5,
    backgroundColor: "red",
    opacity: "80%",
    marginBottom: 20,
  },
}));

const Widget = styled(({ children, title, ...props }: SectionProps) => {
  return (
    <Section noDivider {...props}>
      <div role="navigation" className={styles["side-nav"]}>
        <SectionContent className={styles["side-nav-content"]}>
          <WidgetOtsikko>{title}</WidgetOtsikko>
          {children}
        </SectionContent>
        <div className="pb-2" style={{ background: "linear-gradient(117deg, #009ae0, #49c2f1)" }} />
      </div>
    </Section>
  );
})<ComponentProps<typeof Section>>(() => {
  return sx({
    boxShadow: 1,
  });
});

export default Widget;
