import ExtLink from "@components/ExtLink";
import { AineistoNew, LadattuTiedostoNew } from "@services/api";
import { formatDate } from "common/util/dateUtils";

export default function TiedostoComponent({ tiedosto }: { tiedosto: LadattuTiedostoNew | AineistoNew }) {
  const fileNameSplit = tiedosto.nimi.split(".");
  const fileType: string = fileNameSplit[fileNameSplit?.length - 1];
  const lisatty = tiedosto.lisatty ? formatDate(tiedosto.lisatty) : "";
  if (!tiedosto.tiedosto) {
    return <>{tiedosto.nimi}: VIRHE, ei tiedostoa</>;
  } else {
    return (
      <ExtLink className="file_download" href={"/" + tiedosto.tiedosto} sx={{ mr: 3 }}>
        {tiedosto.nimi}{" "}
        <span className="text-black ml-2">
          ({fileType}) {lisatty}
        </span>
      </ExtLink>
    );
  }
}
