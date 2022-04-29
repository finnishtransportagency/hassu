import { Container } from "@mui/material";
import React, { ReactElement } from "react";
import useTranslation from "next-translate/useTranslation";
import { HeaderProps } from "./header";

export function KansalaisHeader({}: HeaderProps): ReactElement {
  const { t } = useTranslation("common");
  return (
    <Container>
      <div className="bg-gray-light py-4 pl-4">{t("kansalaisheader")}</div>
    </Container>
  );
}

export default KansalaisHeader;
