// import Image from "next/image";
import { Container } from "@mui/material";
import React from "react";
import useTranslation from "next-translate/useTranslation";

export const Footer = ({}) => {

  const { t } = useTranslation("projekti");

  return (
    <div className="bg-gray-lightest w-full self-start mt-auto">
      <Container sx={{ marginTop: 4 }} component="footer">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 py-3">
          <div className="col-span-4">
            {/* <Image src="/vayla-600px.jpg" alt="Väylä" width="100" height="100" /> */}
            {/* <Image src="/ely-400px.png" alt="ELY" width="100" height="100" /> */}
            <p>
              {t("info.hankesuunnitelmista")}
            </p>
            <a href="#">{t("ui-linkkitekstit.hankesuunnittelusivu")}</a>
            <h3 className="mt-3">{t("ui-otsikot.oikopolut")}</h3>
            <a href="#">{t("ui-linkkitekstit.etakaytto")}</a>
          </div>
          <div className="col-span-8 flex md:items-end md:space-x-4 place-content-end flex-col md:flex-row">
            <a href="#">{t("ui-linkkitekstit.saavutettavuus")}</a>
            <a href="#">{t("ui-linkkitekstit.tietoa_sivustosta")}</a>
            <a href="#">{t("ui-linkkitekstit.tietosuoja")}</a>
            <a href="#">{t("ui-linkkitekstit.palautelomake")}</a>
          </div>
        </div>
      </Container>
    </div>
  );
};
