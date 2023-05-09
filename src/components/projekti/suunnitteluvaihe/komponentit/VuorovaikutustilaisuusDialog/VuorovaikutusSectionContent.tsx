import HassuStack from "@components/layout/HassuStack";
import SectionContent from "@components/layout/SectionContent";
import styled from "@emotion/styled";
import { VuorovaikutusTilaisuusTyyppi } from "@services/api";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import { ReactNode } from "react";

const VuorovaikutusSectionContent = styled(SectionContent)(() => ({
  ":not(:last-of-type)": {
    borderBottom: "1px dashed #0064af",
    paddingBottom: "3em",
  },
}));

type Props = {
  tyyppi: VuorovaikutusTilaisuusTyyppi;
  peruttu?: boolean | null | undefined;
  children?: ReactNode;
};

function TilaisuusIcon({ tyyppi, peruttu }: { tyyppi: VuorovaikutusTilaisuusTyyppi; peruttu?: boolean }) {
  const style = { color: peruttu ? "#999999" : "#0064AF", height: "3em!important", width: "3em" };
  return (
    <>
      {tyyppi === VuorovaikutusTilaisuusTyyppi.PAIKALLA && <LocationCityIcon sx={style} />}
      {tyyppi === VuorovaikutusTilaisuusTyyppi.SOITTOAIKA && <LocalPhoneIcon sx={style} />}
      {tyyppi === VuorovaikutusTilaisuusTyyppi.VERKOSSA && <HeadphonesIcon sx={style} />}
    </>
  );
}

export default function VuorovaikutusSectionContentWithIcon({ tyyppi, peruttu, children }: Props) {
  return (
    <VuorovaikutusSectionContent>
      <HassuStack sx={{ width: "100%!important" }} direction="row">
        <div style={{ paddingLeft: "0.5em", paddingRight: "1em " }}>
          <TilaisuusIcon tyyppi={tyyppi} peruttu={!!peruttu} />
        </div>
        <div style={{ width: "100%", paddingRight: "2em" }}>{children}</div>
      </HassuStack>
    </VuorovaikutusSectionContent>
  );
}
