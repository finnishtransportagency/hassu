import React, { useCallback, VFC } from "react";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import Section from "@components/layout/Section2";
import { TiedottaminenPageLayout } from "@components/projekti/tiedottaminen/TiedottaminenPageLayout";
import { H2 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Stack } from "@mui/system";
import { GrayBackgroundText } from "@components/projekti/GrayBackgroundText";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import TiedotettavaHaitari, { GetTiedotettavaFunc } from "@components/projekti/tiedottaminen/TiedotettavaHaitari";
import { Muistuttaja } from "@services/api";
import useApi from "src/hooks/useApi";
import { ColumnDef } from "@tanstack/react-table";
import { formatDateTime } from "common/util/dateUtils";
import ButtonLink from "@components/button/ButtonLink";

export default function Muistuttajat() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <MuistuttajatPage projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const columnsSuomifi: ColumnDef<Muistuttaja>[] = [
  {
    header: "Nimi",
    accessorFn: ({ etunimi, sukunimi }) => (etunimi || sukunimi ? [etunimi, sukunimi].filter((nimi) => nimi).join(" ") : null),
    id: "muistuttajan_nimi",
    meta: {
      widthFractions: 5,
      minWidth: 140,
    },
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: {
      widthFractions: 3,
      minWidth: 120,
    },
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: {
      widthFractions: 1,
      minWidth: 120,
    },
  },
  {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: {
      widthFractions: 2,
      minWidth: 140,
    },
  },
  {
    header: "Muistutusaika",
    accessorFn: ({ lisatty }) => (lisatty ? formatDateTime(lisatty) : null),
    id: "muistutusaika",
    meta: {
      widthFractions: 2,
      minWidth: 140,
    },
  },
];

const MuistuttajatPage: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();

  const api = useApi();

  const getMuistuttajatCallback = useCallback<GetTiedotettavaFunc<Muistuttaja>>(
    async (oid, muutOmistajat, query, from, size) => {
      const response = await api.haeMuistuttajat(oid, muutOmistajat, query, from, size);
      return { hakutulosMaara: response.hakutulosMaara, tiedotettavat: response.muistuttajat };
    },
    [api]
  );

  return (
    <TiedottaminenPageLayout projekti={projekti}>
      <Section>
        <ContentSpacer>
          <Stack direction="row" flexWrap="wrap" alignItems="start" justifyContent="space-between">
            <H2>Muistuttajien tiedottaminen</H2>
            <ButtonLink href={`/api/projekti/${projekti.oid}/excel?kiinteisto=false`}>Vie Exceliin</ButtonLink>
          </Stack>
          <p>
            Tunnistautuneiden muistuttajien yhteystiedot kerätään järjestelmään ja heille lähetetään kuulutus hyväksymispäätöksestä
            järjestelmän kautta automaattisesti. Tämän sivun kuulutuksen vastaanottajalista viedään automaattisesti asianhallintaan, kun
            kuulutus hyväksytään julkaistavaksi. Myös muilla tavoin tiedotettavien muistuttajien lista viedään samalla asianhallintaan.
          </p>
          <GrayBackgroundText>
            <p>
              Muistuttajia on yhteensä <b>{projektinTiedottaminen?.muistuttajaMaara ?? 0} henkilöä</b>.
            </p>
          </GrayBackgroundText>
        </ContentSpacer>
        <TiedotettavaHaitari
          oid={projekti.oid}
          title="Muistuttajien tiedotus Suomi.fi -palvelulla"
          instructionText="Tällä listalla oleville henkilöille lähetetään automaattisesti tieto hyväksymispäätöksen kuulutuksesta Suomi.fi-palvelun kautta. Muistuttajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi."
          filterText="Suodata muistuttajia"
          showLessText="Näytä vähemmän muistuttajia"
          showMoreText="Näytä enemmän muistuttajia"
          columns={columnsSuomifi}
          getTiedotettavatCallback={getMuistuttajatCallback}
          muutTiedotettavat={false}
          excelDownloadHref={`/api/projekti/${projekti.oid}/excel?kiinteisto=false&suomifi=true`}
        />
        <TiedotettavaHaitari
          oid={projekti.oid}
          title="Muistuttajien tiedotus muilla tavoin"
          instructionText="Muistutuksen suunnitelmaan on mahdollista jättää myös kirjaamon sähköpostiin, joten on mahdollista, etteivät kaikki muistuttajat ole tunnistautuneet. Voit listata alle nämä muistuttajat ja tiedottaa heitä hyväksymispäätöksestä järjestelmän ulkopuolella. Muistuttajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi."
          filterText="Suodata muistuttajia"
          showLessText="Näytä vähemmän muistuttajia"
          showMoreText="Näytä enemmän muistuttajia"
          columns={columnsSuomifi}
          getTiedotettavatCallback={getMuistuttajatCallback}
          muutTiedotettavat={true}
          excelDownloadHref={`/api/projekti/${projekti.oid}/excel?kiinteisto=false&suomifi=false`}
        />
      </Section>
    </TiedottaminenPageLayout>
  );
};
