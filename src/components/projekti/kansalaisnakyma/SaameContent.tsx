import ExtLink from "@components/ExtLink";
import FormatDate from "@components/FormatDate";
import { Kieli, Kielitiedot, LadattuTiedosto } from "@services/api";
import React, { ReactElement } from "react";
import useKansalaiskieli from "src/hooks/useKansalaiskieli";
import { splitFilePath } from "src/util/fileUtil";

interface SaameContentProps {
  kielitiedot: Kielitiedot | null | undefined;
  kuulutusPDF: LadattuTiedosto | null | undefined;
  otsikko: string;
  kappale1: string | JSX.Element;
}

export default function SaameContent(props: SaameContentProps): ReactElement {
  const kieli = useKansalaiskieli();

  if (props.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI) {
    const { path, fileExt, fileName } = splitFilePath(props.kuulutusPDF?.tiedosto || undefined);
    return (
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
    );
  } else {
    return <></>;
  }
}
