import Button from "@components/button/Button";
import { MenuItem, MenuList, styled, experimental_sx as sx, menuItemClasses } from "@mui/material";
import { TilaSiirtymaInput, TilasiirtymaTyyppi } from "@services/api";
import React, { useState, VoidFunctionComponent } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { KeyedMutator } from "swr";
import { SiirraModal } from "./SiirraButton";
import { UudelleenkuulutaModal } from "./UudelleenkuulutaButton";

export type ToiminnotButtonProps = { reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> } & Pick<TilaSiirtymaInput, "oid">;

const ToiminnotButton: VoidFunctionComponent<ToiminnotButtonProps> = ({ oid, reloadProjekti }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUudelleenkuulutaModalOpen, setIsUudelleenkuulutaModalOpen] = useState(false);
  const [isSiirraModalOpen, setIsSiirraModalOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <Button onClick={() => setIsMenuOpen(!isMenuOpen)} id="siirra_button" endIcon="ellipsis-v" style={{ zIndex: 1 }}>
        Toiminnot
      </Button>
      {isMenuOpen && (
        <ToiminnotMenu>
          <MenuItem onClick={() => setIsUudelleenkuulutaModalOpen(true)}>Uudelleenkuuluta</MenuItem>
          <MenuItem onClick={() => setIsSiirraModalOpen(true)}>Siirrä</MenuItem>
        </ToiminnotMenu>
      )}
      <UudelleenkuulutaModal
        open={isUudelleenkuulutaModalOpen}
        onClose={() => {
          setIsUudelleenkuulutaModalOpen(false);
          setIsMenuOpen(false);
        }}
        oid={oid}
        reloadProjekti={reloadProjekti}
        tyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO}
      />
      <SiirraModal
        open={isSiirraModalOpen}
        onClose={() => {
          setIsSiirraModalOpen(false);
          setIsMenuOpen(false);
        }}
        oid={oid}
        reloadProjekti={reloadProjekti}
      />
    </div>
  );
};

const ToiminnotMenu = styled(MenuList)(() =>
  sx({
    position: "absolute",
    width: "100%",
    boxShadow: 1,
    backgroundColor: "white",
    paddingBottom: 0,
    marginTop: "-1.6em",
    "::before": {
      content: "''",
      display: "block",
      height: "1.6em",
    },
    [`.${menuItemClasses.root}`]: {
      border: "2px solid transparent",
      [`:hover`]: {
        backgroundColor: "rgb(237, 250, 255)",
      },
      [`&.${menuItemClasses.focusVisible}`]: {
        backgroundColor: "rgb(237, 250, 255)",
        border: "2px solid rgb(0, 100, 175)",
        borderRadius: 1,
      },
    },
  })
);

export default ToiminnotButton;
