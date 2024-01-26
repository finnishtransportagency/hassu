import React, { useCallback, useRef, useState } from "react";
import { Dialog, DialogActions, DialogContent, DialogProps, styled } from "@mui/material";
import { StyledMap } from "@components/projekti/common/StyledMap";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";

export default function Kiinteistonomistajat() {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  return (
    <ProjektiConsumer>
      {(projekti) => (
        <>
          <Button onClick={open}>Avaa dialogi</Button>
          <KarttaDialogi projekti={projekti} open={isOpen} onClose={close} />
        </>
      )}
    </ProjektiConsumer>
  );
}

const KarttaDialogi = styled(
  ({
    children,
    projekti,
    onClose,
    ...props
  }: DialogProps & Required<Pick<DialogProps, "onClose">> & { projekti: ProjektiLisatiedolla }) => {
    const isMapEditedByUserRef = useRef(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const closeConfirmation = useCallback(() => {
      setIsConfirmationOpen(false);
    }, []);

    const closeMainDialog = useCallback(() => {
      onClose({}, "backdropClick");
    }, [onClose]);

    const closeAll = useCallback(() => {
      closeConfirmation();
      closeMainDialog();
    }, [closeConfirmation, closeMainDialog]);

    const handleMainDialogOnClose = useCallback(() => {
      if (isMapEditedByUserRef.current) {
        setIsConfirmationOpen(true);
      } else {
        closeAll();
      }
    }, [closeAll]);

    const triggerMapEditedByUser = useCallback(() => {
      isMapEditedByUserRef.current = true;
    }, []);
    const clearMapEditedByUser = useCallback(() => {
      isMapEditedByUserRef.current = false;
    }, []);

    return (
      <>
        <Dialog fullScreen onClose={handleMainDialogOnClose} {...props}>
          <StyledMap
            triggerMapEditedByUser={triggerMapEditedByUser}
            clearMapEditedByUser={clearMapEditedByUser}
            projekti={projekti}
            closeDialog={handleMainDialogOnClose}
          >
            {children}
          </StyledMap>
        </Dialog>
        <HassuDialog maxWidth="sm" open={isConfirmationOpen} title="Poistu karttatyökalusta" onClose={closeConfirmation}>
          <DialogContent>
            <p>Rajausta ei ole tallennettu. Listaa kiinteistöistä ei haeta.</p>
          </DialogContent>
          <DialogActions>
            <Button type="button" primary onClick={closeAll}>
              Poistu
            </Button>
            <Button type="button" onClick={closeConfirmation}>
              Peruuta
            </Button>
          </DialogActions>
        </HassuDialog>
      </>
    );
  }
)({});
