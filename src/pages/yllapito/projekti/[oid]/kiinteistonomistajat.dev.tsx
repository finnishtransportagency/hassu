import React, { useEffect, useState } from "react";
import { Dialog, DialogProps, styled } from "@mui/material";
import { StyledMap } from "@components/projekti/common/StyledMap";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import axios from "axios";
import useSnackbars from "src/hooks/useSnackbars";

export default function Kiinteistonomistajat() {
  return (
    <ProjektiConsumer>
      {(projekti) => <>({typeof window !== "undefined" && <KarttaDialogi projekti={projekti} open />})</>}
    </ProjektiConsumer>
  );
}

const KarttaDialogi = styled(({ children, projekti, ...props }: DialogProps & { projekti: ProjektiLisatiedolla }) => {
  const { showErrorMessage } = useSnackbars();
  const [geoJSON, setGeoJSON] = useState<string | null | undefined>(null);

  useEffect(() => {
    const updateGeoJson = async () => {
      try {
        if (!projekti.karttarajaus) {
          setGeoJSON(undefined);
          return;
        }
        const response = await axios.get(`/yllapito/tiedostot/projekti/${projekti.oid}/karttarajaus/karttarajaus.geojson`, {
          responseType: "blob",
        });

        if (!(response.data instanceof Blob)) {
          showErrorMessage("Karttarajaamisen lataaminen epäonnistui");
          return;
        }
        const text = await response.data.text();
        setGeoJSON(text);
      } catch (e) {
        console.log(e);
        showErrorMessage("Karttarajaamisen lataaminen epäonnistui");
      }
    };
    updateGeoJson();
  }, [projekti.karttarajaus, projekti.oid, showErrorMessage]);

  return (
    <Dialog fullScreen {...props}>
      <StyledMap projekti={projekti} geoJSON={geoJSON}>
        {children}
      </StyledMap>
    </Dialog>
  );
})({});
