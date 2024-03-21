import React, { useCallback, VFC } from "react";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { TiedottaminenPageLayout } from "@components/projekti/tiedottaminen/TiedottaminenPageLayout";
import { H2 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Stack } from "@mui/system";
import KiinteistonomistajaHaitari, { SearchTiedotettavatFunction } from "@components/projekti/tiedottaminen/KiinteistonomistajaTable";
import { GrayBackgroundText } from "@components/projekti/GrayBackgroundText";
import { Muistuttaja } from "@services/api";
import useApi from "src/hooks/useApi";
import IconButton from "@components/button/IconButton";
import { ColumnDef } from "@tanstack/react-table";
import { formatDateTime } from "common/util/dateUtils";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";

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
  {
    header: "",
    id: "actions",
    meta: {
      widthFractions: 2,
      minWidth: 120,
    },
    accessorKey: "id",
    cell: () => {
      return <IconButton sx={{ display: "block", margin: "auto" }} type="button" disabled icon="trash" />;
    },
  },
];

const columnsMuutMuistuttajat: ColumnDef<Muistuttaja>[] = [
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
    header: "Tiedotustapa",
    accessorKey: "tiedotustapa",
    id: "tiedotustapa",
    meta: {
      widthFractions: 2,
      minWidth: 140,
    },
  },
  {
    header: "",
    id: "actions",
    meta: {
      widthFractions: 2,
      minWidth: 120,
    },
    accessorKey: "id",
    cell: () => {
      return <IconButton sx={{ display: "block", margin: "auto" }} type="button" disabled icon="trash" />;
    },
  },
];

const MuistuttajatPage: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const api = useApi();

  const searchTiedotettavat: SearchTiedotettavatFunction<Muistuttaja> = useCallback(
    async (
      oid: string,
      muutOmistajat: boolean,
      query: string | null | undefined,
      from: number | null | undefined,
      size: number | null | undefined
    ) => {
      const response = await api.haeMuistuttajat(oid, muutOmistajat, query, from, size);
      return { hakutulosMaara: response.hakutulosMaara, tulokset: response.muistuttajat };
    },
    [api]
  );

  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();

  return (
    <TiedottaminenPageLayout projekti={projekti}>
      <Section>
        <ContentSpacer>
          <Stack direction="row" flexWrap="wrap" justifyContent="space-between">
            <H2>Muistuttajien tiedottaminen</H2>
            <Button disabled>Vie Exceliin</Button>
          </Stack>
          <p>
            Tunnistautuneiden muistuttajien yhteystiedot kerätään järjestelmään ja heille lähetetään kuulutus hyväksymispäätöksestä
            järjestelmän kautta automaattisesti. Tämän sivun vastaanottajalista viedään automaattisesti asianhallintaan kuulutuksen
            julkaisupäivänä. Tämä koskee myös tälle sivulle kerättyjen tunnistautumattomien muistuttajien tietoja.
          </p>
          <GrayBackgroundText>
            <p>
              Muistuttajia on yhteensä <b>{projektinTiedottaminen?.muistuttajaMaara ?? 0} henkilö(ä)</b>.
            </p>
          </GrayBackgroundText>
        </ContentSpacer>
        <KiinteistonomistajaHaitari
          searchTiedotettavat={searchTiedotettavat}
          columns={columnsSuomifi}
          oid={projekti.oid}
          filterText="Suodata muistuttajia"
          title="Muistuttajien tiedotus Suomi.fi -palvelulla"
          instructionText="Tällä listalla oleville henkilöille lähetetään automaattisesti tieto hyväksymispäätöksen kuulutuksesta Suomi.fi-palvelun kautta. Muistuttajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi."
        />
        <KiinteistonomistajaHaitari
          searchTiedotettavat={searchTiedotettavat}
          columns={columnsMuutMuistuttajat}
          muutTiedotettavat
          oid={projekti.oid}
          filterText="Suodata muistuttajia"
          title="Muistuttajien tiedotus muilla tavoin"
          instructionText="Muistutuksen suunnitelmaan on mahdollista jättää myös kirjaamon sähköpostiin, joten on mahdollista, etteivät kaikki muistuttajat ole tunnistautuneet. Voit listata alle nämä muistuttajat ja tiedottaa heitä hyväksymispäätöksestä järjestelmän ulkopuolella. Muistuttajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi."
        />
      </Section>
    </TiedottaminenPageLayout>
  );
};
