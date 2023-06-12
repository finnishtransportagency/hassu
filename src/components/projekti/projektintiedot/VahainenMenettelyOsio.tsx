import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import Notification, { NotificationType } from "@components/notification/Notification";
import { Checkbox, FormControlLabel, Link } from "@mui/material";
import { MuokkausTila, TallennaProjektiInput } from "@services/api";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

type Props = { formDisabled?: boolean; projekti: ProjektiLisatiedolla };

export default function VahainenMenettelyOsio({ formDisabled, projekti }: Props) {
  const { control } = useFormContext<Partial<TallennaProjektiInput>>();

  const vahainenMenettelyCanBeChanged = !projekti?.aloitusKuulutus || projekti?.aloitusKuulutus?.muokkausTila == MuokkausTila.MUOKKAUS;

  const disabled = formDisabled || !vahainenMenettelyCanBeChanged;

  return (
    <Section>
      <ContentSpacer>
        <h4 className="vayla-small-title">Vähäinen menettely</h4>
        <p>
          Projektin menettelytavaksi voidaan valita vähäinen menettely jos suunnitelma on vaikutuksiltaan vähäinen. Vähäinen menettely eroaa
          normaalista menettelytavasta siten, että vuorovaikutus suunnitelmista käydään suoraan asianosaisten ja kunnan kanssa.
        </p>
        <p>
          {"Jos et ole varma valinnasta, käänny suunnitteluohjauksen puoleen: "}
          {/* The target prevents link from triggering useLeavePrevention.tsx hooks beforeunload handler */}
          <Link className="vayla-body-text text-primary-dark" underline="none" href="mailto:tiesu@vayla.fi" target="hidden-iframe">
            tiesu@vayla.fi
          </Link>
          {"."}
        </p>
        {/* This iframe is the target of 'mailto' link above. It's used to prevent useLeavePrevention.tsx hooks beforeunload handler from triggering */}
        <iframe name="hidden-iframe" style={{ visibility: "hidden", position: "absolute" }} />
      </ContentSpacer>
      <Notification icon="info-circle" type={NotificationType.INFO_GRAY}>
        <p className="vayla-body-text">
          Huomioithan, että valinta vaikuttaa kuulutusten lakiviitteisiin ja kokonaisprosessin sisältöön järjestelmässä.
        </p>
      </Notification>
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Sovelletaanko projektissa vähäistä menettelytapaa?</h5>
        <Controller
          name="vahainenMenettely"
          shouldUnregister
          control={control}
          render={({ field: { value, onChange, ...field } }) => (
            <FormControlLabel
              disabled={disabled}
              label="Kyllä, projektissa sovelletaan vähäistä menettelyä."
              control={
                <Checkbox
                  checked={!!value}
                  onChange={(event) => {
                    onChange(event.target.checked);
                  }}
                  {...field}
                />
              }
            />
          )}
        />
        <p>Valintaan voi vaikuttaa aloituskuulutuksen hyväksymiseen saakka, jonka jälkeen valinta lukittuu.</p>
      </ContentSpacer>
    </Section>
  );
}
