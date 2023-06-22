import Button from "@components/button/Button";
import { MenuItem, MenuList, styled, experimental_sx as sx } from "@mui/material";
import { TilaSiirtymaInput } from "@services/api";
import React, { useState, VoidFunctionComponent } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KeyedMutator } from "swr";

export type ToiminnotButtonProps = { reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> } & Pick<TilaSiirtymaInput, "oid">;

const ToiminnotButton: VoidFunctionComponent<ToiminnotButtonProps> = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <Button onClick={() => setIsMenuOpen(!isMenuOpen)} id="siirra_button" endIcon="ellipsis-v">
        Toiminnot
      </Button>
      {isMenuOpen && (
        <ToiminnotMenu>
          <MenuItem>test</MenuItem>
          <MenuItem>test2</MenuItem>
        </ToiminnotMenu>
      )}
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
  })
);

export default ToiminnotButton;
