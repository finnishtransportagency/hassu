import React, { useState } from "react";
import { Dialog } from "@mui/material";
import { VideoWrapper, VideoIframe, SideVideoContainer, DialogVideoContainer } from "./VideoStyles";
import { ExpansionButton, CloseButton } from "./VideoButtons";

interface VideoUpotusProps {
  videoId: string | null;
}

const VideoUpotus: React.FC<VideoUpotusProps> = ({ videoId }) => {
  const [open, setOpen] = useState(false);

  if (!videoId) return null;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <SideVideoContainer>
        <VideoWrapper>
          <VideoIframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
          <ExpansionButton onOpen={handleOpen} />
        </VideoWrapper>
      </SideVideoContainer>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth={true}
        PaperProps={{
          style: { overflow: "visible" },
        }}
      >
        <CloseButton onClose={handleClose} />
        <DialogVideoContainer>
          <div style={{ position: "relative", width: "100%", height: 550 }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogVideoContainer>
      </Dialog>
    </>
  );
};

export default VideoUpotus;
