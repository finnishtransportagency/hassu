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
  kappale1: string;
}

export default function SaameContent(props: SaameContentProps): ReactElement {
  const kieli = useKansalaiskieli();

  if (props.kielitiedot?.toissijainenKieli === Kieli.POHJOISSAAME && kieli === Kieli.SUOMI) {
    const { path, fileExt, fileName } = splitFilePath(props.kuulutusPDF?.tiedosto || undefined);
    return (
      <div>
        <h2 className="vayla-small-title">{props.otsikko}</h2>
        <h3 className="vayla-label">{props.kielitiedot.projektinNimiVieraskielella}</h3>
        {path && (
          <p>
            <ExtLink className="file_download" href={path} style={{ marginRight: "0.5rem" }}>
              {fileName}
            </ExtLink>{" "}
            ({fileExt}) (
            <FormatDate date={props.kuulutusPDF?.tuotu} />)
          </p>
        )}

        <p className="mt-2">{props.kappale1}</p>
      </div>
    );
  } else {
    return <></>;
  }
}
