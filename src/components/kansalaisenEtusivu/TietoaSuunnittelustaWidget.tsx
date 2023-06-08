import React from "react";
import Button from "@components/button/Button";
import HassuLink from "@components/HassuLink";
import Widget from "./Widget";

const TietoaSuunnittelustaWidget = () => {
  return (
    <React.Fragment>
      <img src="/rata_ja_tie_background.jpeg" alt="Kuva rautatiestä" />
      <Widget title={"Tietoa suunnittelusta"}>
        Tutustu hankesuunnittelun ja kansalaisen osallistumismahdollisuuksiin hankkeen suunnittelun aikana.
        <HassuLink href="/tietoa-palvelusta/tietoa-suunnittelusta">
          <Button className="mt-8 mb-4" style={{ whiteSpace: "nowrap" }}>
            Tutustu suunnitteluun
          </Button>
        </HassuLink>
      </Widget>
    </React.Fragment>
  );
};

export default TietoaSuunnittelustaWidget;
