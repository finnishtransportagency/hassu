import React from "react";
import { ProjektiTyyppi } from "@services/api";
import VideoUpotus from "./VideoUpotus";
import useTranslation from "next-translate/useTranslation";
import { SideCardHeading } from "../SideCard";

interface VideoComponentProps {
  projekti: {
    velho?:
      | {
          tyyppi?: ProjektiTyyppi | null | undefined;
        }
      | null
      | undefined;
  };
}

export const DynaaminenVideoUpotus: React.FC<VideoComponentProps> = ({ projekti }) => {
  const { t } = useTranslation("projekti-side-bar");

  const suunnitelmanTyyppi = projekti?.velho?.tyyppi;
  const videoIdMap: Record<ProjektiTyyppi, string> = {
    [ProjektiTyyppi.TIE]: "QJ9NcvZb9iE",
    [ProjektiTyyppi.RATA]: "ZLd-nbBAStU",
    [ProjektiTyyppi.YLEINEN]: "T2tfjTu3it8",
  };

  const videoId = suunnitelmanTyyppi && videoIdMap[suunnitelmanTyyppi] ? videoIdMap[suunnitelmanTyyppi] : null;

  return (
    <>
      <SideCardHeading>{t(`tutustu-videoiden-avulla-${suunnitelmanTyyppi}`)}</SideCardHeading>
      <VideoUpotus videoId={videoId} />
    </>
  );
};

export default DynaaminenVideoUpotus;
