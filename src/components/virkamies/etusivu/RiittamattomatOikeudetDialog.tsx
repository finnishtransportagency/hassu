import HassuDialog, { HassuDialogProps } from "@components/HassuDialog";
import { ExternalStyledLink } from "@components/StyledLink";
import Button from "@components/button/Button";
import ContentSpacer from "@components/layout/ContentSpacer";
import { DialogActions, DialogContent } from "@mui/material";
import { ProjektiHakutulosDokumentti } from "@services/api";
import { isDateTimeInThePast } from "backend/src/util/dateUtil";
import { LinkProps } from "next/link";
import React, { VFC, useCallback, useMemo } from "react";

export const RiittamattomatOikeudetDialog: VFC<Omit<HassuDialogProps, "open"> & { projekti: ProjektiHakutulosDokumentti | null }> = ({
  projekti,
  ...props
}) => {
  const sulje: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    props?.onClose?.({}, "escapeKeyDown");
  }, [props]);

  const velhoURL: string | undefined = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_VELHO_BASE_URL;
    if (!baseUrl || !projekti) {
      return undefined;
    }
    return process.env.NEXT_PUBLIC_VELHO_BASE_URL + "/projektit/oid-" + projekti.oid;
  }, [projekti]);

  const julkinenURL: LinkProps["href"] | undefined = useMemo(() => {
    if (!projekti?.oid || !projekti.viimeisinJulkaisu || !isDateTimeInThePast(projekti.viimeisinJulkaisu, "start-of-day")) {
      return undefined;
    }
    return { pathname: "/suunnitelma/[oid]", query: { oid: projekti.oid } };
  }, [projekti?.oid, projekti?.viimeisinJulkaisu]);

  return (
    <HassuDialog title="Riittämättömät oikeudet" open={!!projekti} {...props}>
      <DialogContent>
        <ContentSpacer gap={7}>
          <p>
            Et pääse tarkastelemaan projektin tietoja, sillä et ole projektin jäsen. Suunnitelman julkaistuja tietoja pääset tarkastelemaan
            palvelun julkiselta puolelta. Jos tarvitset oikeudet projektiin, ota yhteys projektin projektipäällikköön.
          </p>
          <ContentSpacer as="ul" gap={4}>
            {julkinenURL && (
              <li>
                <ExternalStyledLink href={julkinenURL}>Siirry suunnitelmaan palvelun julkiselle puolelle</ExternalStyledLink>
              </li>
            )}
            {velhoURL && (
              <li>
                <ExternalStyledLink href={velhoURL}>Siirry Projektivelhoon</ExternalStyledLink>
              </li>
            )}
          </ContentSpacer>
        </ContentSpacer>
      </DialogContent>
      <DialogActions>
        <Button primary onClick={sulje}>
          Sulje
        </Button>
      </DialogActions>
    </HassuDialog>
  );
};
