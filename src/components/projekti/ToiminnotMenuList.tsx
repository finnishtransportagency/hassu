import Button from "@components/button/Button";
import { MenuList, styled, experimental_sx as sx, menuItemClasses, ClickAwayListener } from "@mui/material";
import React, { useState, useCallback, useEffect, ReactNode } from "react";

const ToiminnotMenuList = ({ children }: { children?: ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const close = useCallback(() => {
    setIsMenuOpen(false);
  }, []);
  const toggleMenuOpen = useCallback(() => {
    setIsMenuOpen((prevMenuOpen) => !prevMenuOpen);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
    function handleKeyDown(nativeEvent: KeyboardEvent) {
      if (nativeEvent.key === "Escape") {
        close();
      } else if (nativeEvent.key === "Tab") {
        nativeEvent.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isMenuOpen]);

  return (
    <ClickAwayListener onClickAway={close}>
      <div style={{ position: "relative" }}>
        <Button onClick={toggleMenuOpen} id="toiminnot_button" endIcon="ellipsis-v" style={{ zIndex: 1 }}>
          Toiminnot
        </Button>
        {isMenuOpen && <ToiminnotMenu>{children}</ToiminnotMenu>}
      </div>
    </ClickAwayListener>
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

export default ToiminnotMenuList;
