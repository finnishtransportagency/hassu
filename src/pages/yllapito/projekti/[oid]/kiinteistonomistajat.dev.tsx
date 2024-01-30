import React, { useCallback, useState } from "react";
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
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
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

    const handleMainDialogOnClose = useCallback(
      (isMapEdited: boolean) => {
        if (isMapEdited) {
          setIsConfirmationOpen(true);
        } else {
          closeAll();
        }
      },
      [closeAll]
    );

    return (
      <>
        <Dialog fullScreen onClose={handleMainDialogOnClose} {...props}>
          <StyledMap projekti={projekti} closeDialog={handleMainDialogOnClose}>
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
