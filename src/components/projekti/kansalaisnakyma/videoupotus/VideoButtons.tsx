import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { ExpandButton, CloseIconButton } from "./VideoStyles";

interface ExpansionButtonProps {
  onOpen: () => void;
}

export const ExpansionButton: React.FC<ExpansionButtonProps> = ({ onOpen }) => (
  <ExpandButton size="small" onClick={onOpen} startIcon={<OpenInFullIcon />} />
);

interface CloseButtonProps {
  onClose: () => void;
}

export const CloseButton: React.FC<CloseButtonProps> = ({ onClose }) => (
  <CloseIconButton aria-label="close" onClick={onClose}>
    <CloseIcon />
  </CloseIconButton>
);
