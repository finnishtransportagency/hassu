import ExtLink from "@components/ExtLink";
import { FILE_PATH_DELETED_PREFIX } from "../../../common/links";
import { LadattuTiedostoTila } from "../../../common/graphql/apiModel";

interface Props {
  addTopMargin?: boolean;
  tiedostoPolku?: string | null;
  tiedostoNimi: string;
  tiedostoTila?: LadattuTiedostoTila | null;
}

const HassuLadattuTiedostoNimiExtLink = ({
  tiedostoNimi,
  tiedostoPolku,
  addTopMargin,
  tiedostoTila,
  ...extlinkProps
}: Props & Omit<React.ComponentProps<typeof ExtLink>, "children">) => {
  let href = tiedostoPolku || undefined;

  const isDeleted = !!href && href.startsWith(FILE_PATH_DELETED_PREFIX);
  href = isDeleted ? undefined : href;

  return (
    <ExtLink
      className="file_download"
      sx={addTopMargin ? { marginTop: 4 } : undefined}
      href={href}
      target="_blank"
      disabled={!href || tiedostoTila !== LadattuTiedostoTila.VALMIS}
      hideIcon={!href}
      {...extlinkProps}
    >
      {tiedostoNimi}
    </ExtLink>
  );
};

export default HassuLadattuTiedostoNimiExtLink;
