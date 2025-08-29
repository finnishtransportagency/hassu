import ExtLink from "@components/ExtLink";
import FormatDate from "@components/FormatDate";
import { Kieli, Kielitiedot, LadattuTiedosto } from "@services/api";
import React, { ReactElement } from "react";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { splitFilePath } from "src/util/fileUtil";
import Notification, { NotificationType } from "@components/notification/Notification";
import { styled } from "@mui/material";
import { experimental_sx as sx } from "@mui/material";
interface SaameContentProps {
  kielitiedot: Kielitiedot | null | undefined;
  kuulutusPDF: LadattuTiedosto | null | undefined;
  otsikko: string;
  kappale1: string | JSX.Element;
}

const Grid = styled("div")(() => {
  return sx({
    display: "grid",
    columnGap: 3,
    rowGap: 4,
    gridTemplateColumns: "auto auto",
  });
});
const Img = styled("img")({});

export default function SaameContent(props: SaameContentProps): ReactElement {
  const kieli = useKansalaiskieli();

  if (props.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI) {
    const { path, fileExt, fileName } = splitFilePath(props.kuulutusPDF?.tiedosto || undefined);
    return (
      <Notification type={NotificationType.INFO_GRAY} hideIcon aria-label="Suunnitelman saamenkieliset tiedot" lang="se-FI">
        <Grid>
          <Img src="/assets/saamen_lippu.svg" alt="Saamen lippu" sx={{ maxHeight: "1.75em" }} />
          <div>
            <h2 className="vayla-subtitle mb-4">{props.otsikko}</h2>
            <h3 className="vayla-smallest-title mb-0">{props.kielitiedot.projektinNimiVieraskielella}</h3>
            {path && (
              <p className="vayla-body-text">
                <strong>
                  <ExtLink className="file_download" href={path} style={{ marginRight: "0.5rem" }}>
                    {fileName}
                  </ExtLink>
                </strong>{" "}
                ({fileExt}) (
                <FormatDate date={props.kuulutusPDF?.tuotu} />)
              </p>
            )}

            <p className="vayla-body-text mt-5">{props.kappale1}</p>
          </div>
        </Grid>
      </Notification>
    );
  } else {
    return <></>;
  }
}
