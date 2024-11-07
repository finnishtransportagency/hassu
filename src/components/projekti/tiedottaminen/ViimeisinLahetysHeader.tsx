import React, { useCallback, useEffect, useRef } from "react";
import { ClickAwayListener, IconButton, Popper, styled, SvgIcon } from "@mui/material";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Stack } from "@mui/system";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faEnvelope, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import Notification from "@components/notification/Notification";

export function ViimeisinLahetysHeader() {
  const [open, setOpen] = React.useState(false);

  const handleClick = useCallback(() => {
    setOpen((previousOpen) => !previousOpen);
  }, []);

  const handleTooltipClose = useCallback(() => {
    setOpen(false);
  }, []);

  const buttonRef = useRef<HTMLButtonElement>(null);

  const id = open ? "viimeisin-lahetysaika-tooltip" : undefined;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleKeyDown(nativeEvent: KeyboardEvent) {
      if (nativeEvent.key === "Escape") {
        handleTooltipClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleTooltipClose, open]);

  return (
    <Stack rowGap={2} columnGap={2} alignItems="end" direction="row">
      <span>Viimeisin lähetysaika</span>
      <ClickAwayListener onClickAway={handleTooltipClose}>
        <div>
          <IconButton ref={buttonRef} type="button" onClick={handleClick} sx={{ marginBottom: "-2px" }} size="small">
            <SvgIcon fontSize="small">
              <FontAwesomeIcon icon="info-circle" />
            </SvgIcon>
          </IconButton>
          {/* @ts-ignore */}
          <NotificationPopper id={id} anchorEl={buttonRef.current} disablePortal={true} open={open}>
            <Notification>
              <ContentSpacer gap={2}>
                <b>Selitteet</b>
                <SeliteLista>
                  <dt>-</dt>
                  <dd>Ei tiedotuksia</dd>
                  <dt>
                    <FontAwesomeIcon icon={faEnvelope} color="#207a43" />
                  </dt>
                  <dd>Tiedotettu</dd>
                  <dt>
                    <FontAwesomeIcon icon={faCheck} color="#207a43" />
                  </dt>
                  <dd>Tiedotettu toisesta kiinteistöstä tai muistutuksesta</dd>
                  <dt>
                    <FontAwesomeIcon icon={faTriangleExclamation} color="#f10e0e" />
                  </dt>
                  <dd>Tiedottaminen epäonnistunut</dd>
                </SeliteLista>
              </ContentSpacer>
            </Notification>
          </NotificationPopper>
        </div>
      </ClickAwayListener>
    </Stack>
  );
}
const NotificationPopper = styled(Popper)(({ theme }) => ({
  color: theme.palette.text.primary,
  maxWidth: "100%",
  zIndex: theme.zIndex.tooltip,
  fontWeight: 400,
  "&[data-popper-reference-hidden]": {
    visibility: "hidden",
    pointerEvents: "none",
  },
}));

const SeliteLista = styled("dl")(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "min-content 1fr",
  rowGap: theme.spacing(1),
  columnGap: theme.spacing(4),
  "& dt": {
    justifySelf: "center",
  },
}));
