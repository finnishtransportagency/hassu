import ContentSpacer from "@components/layout/ContentSpacer";
import Section from "@components/layout/Section2";
import Notification, { NotificationType } from "@components/notification/Notification";
import { Checkbox, FormControlLabel, Link } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import { isAllowedToChangeVahainenMenettely } from "hassu-common/util/operationValidators";
import React, { Fragment } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { H3 } from "../../Headings";

type Props = { formDisabled?: boolean; projekti: ProjektiLisatiedolla };

export default function VahainenMenettelyOsio({ formDisabled, projekti }: Props) {
  const { control } = useFormContext<Partial<TallennaProjektiInput>>();

  const vahainenMenettelyCanBeChanged = isAllowedToChangeVahainenMenettely(projekti);

  const disabled = formDisabled || !vahainenMenettelyCanBeChanged;

  const emails = ["tiesu@vayla.fi", "ratsu@vayla.fi"];

  return (
    <Section>
      <ContentSpacer>
        <H3>Vähäinen menettely</H3>
        <p>
          Jos suunnitelma on vaikutuksiltaan vähäinen, eikä sanottavasti muuta paikallisia liikenneolosuhteita, projektin menettelytavaksi
          voidaan valita vähäinen menettely. Sillä tarkoitetaan LjMTL 28 § tai RataL 23 § mukaista menettelyä. Vähäinen menettely eroaa
          normaalista menettelytavasta siten, että vuorovaikutus suunnitelmista käydään suoraan vain kiinteistönomistajien ja kunnan kanssa.
        </p>
        <p>
          {"Jos et ole varma valinnasta, käänny suunnitteluohjauksen puoleen:"}
          {/* The target prevents link from triggering useLeavePrevention.tsx hooks beforeunload handler */}
          {emails.map((email, index) => (
            <Fragment key={email}>
              {" "}
              <Link
                key={email}
                className="vayla-body-text text-primary-dark"
                underline="none"
                href={`mailto:${email}`}
                target="hidden-iframe"
              >
                {email}
              </Link>
              {index < emails.length - 1 && " tai "}
            </Fragment>
          ))}
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
        <h4 className="vayla-smallest-title">Sovelletaanko projektissa vähäistä menettelytapaa?</h4>
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
        <p>Valintaan voi vaikuttaa aloituskuulutuksen tekemiseen saakka, jonka jälkeen valinta lukittuu.</p>
      </ContentSpacer>
    </Section>
  );
}
