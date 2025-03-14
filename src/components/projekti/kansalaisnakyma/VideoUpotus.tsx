import React from "react";
import { styled } from "@mui/material";
import { ProjektiTyyppi } from "@services/api";

export const VideoWrapper = styled("div")(() => ({
  position: "relative",
  overflow: "hidden",
  width: "100%",
  paddingTop: "56.25%",
}));

export const VideoIframe = styled("iframe")(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: "100%",
  height: "100%",
  border: "none",
}));

interface VideoUpotusProps {
  videoId: string | null;
}

const VideoUpotus: React.FC<VideoUpotusProps> = ({ videoId }) => {
  if (!videoId) return null;

  return (
    <VideoWrapper>
      <VideoIframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </VideoWrapper>
  );
};

//export default VideoUpotus;

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
  const suunnitelmanTyyppi = projekti?.velho?.tyyppi;

  const videoIdMap: Record<ProjektiTyyppi, string> = {
    [ProjektiTyyppi.TIE]: "dQw4w9WgXcQ", //rick astley
    [ProjektiTyyppi.RATA]: "FTQbiNvZqaY", //toto
    [ProjektiTyyppi.YLEINEN]: "izGwDsrQ1eQ", //george
  };

  const videoId = suunnitelmanTyyppi && videoIdMap[suunnitelmanTyyppi] ? videoIdMap[suunnitelmanTyyppi] : null;

  return <VideoUpotus videoId={videoId} />;
};
