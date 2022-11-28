import ExtLink from "@components/ExtLink";

interface Props {
  addTopMargin?: boolean;
  tiedostoPolku?: string | null;
  aineistoNimi: string;
}

const HassuAineistoNimiExtLink = ({
  aineistoNimi,
  tiedostoPolku,
  addTopMargin,
  ...extlinkProps
}: Props & Omit<React.ComponentProps<typeof ExtLink>, "children">) => {
  const href = tiedostoPolku || undefined;
  return (
    <ExtLink
      sx={addTopMargin ? { marginTop: 4 } : undefined}
      href={href}
      target="_blank"
      disabled={!href}
      hideIcon={!href}
      {...extlinkProps}
    >
      {aineistoNimi}
    </ExtLink>
  );
};

export default HassuAineistoNimiExtLink;
