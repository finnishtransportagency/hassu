import { AineistoTila } from "hassu-common/graphql/apiModel";
import { Aineisto } from "../../../database/model";
import { fileService } from "../../../files/fileService";
import { omit } from "lodash";
import { PathTuple } from "../../../files/ProjektiPath";
import contentDisposition from "content-disposition";
import { velho } from "../../../velho/velhoClient";
import { nyt } from "../../../util/dateUtil";
import * as mime from "mime-types";

export default async function handleAineistot({
  oid,
  aineistot,
  paths,
}: {
  oid: string;
  aineistot: Array<Aineisto>;
  paths: PathTuple;
}): Promise<Array<Aineisto>> {
  const handledTiedostot = await Promise.all(aineistot.map((aineisto) => handleAineisto({ oid, aineisto, paths })));
  return handledTiedostot.filter((_tiedosto, index) => aineistot[index].tila != AineistoTila.ODOTTAA_POISTOA);
}

export async function handleAineisto({ oid, aineisto, paths }: { oid: string; aineisto: Aineisto; paths: PathTuple }) {
  switch (aineisto.tila) {
    case AineistoTila.VALMIS:
      return aineisto;
    case AineistoTila.ODOTTAA_POISTOA:
      await fileService.deleteAineisto(oid, omit(aineisto, "kategoriaMuuttunut"), paths.yllapitoPath, paths.publicPath, "ODOTTAA_POISTOA");
      return aineisto;
    case AineistoTila.ODOTTAA_TUONTIA:
      return importAineisto(aineisto, oid, paths);
    default:
      return aineisto;
  }
}

export async function importAineisto(aineisto: Aineisto, oid: string, path: PathTuple): Promise<Aineisto> {
  const { disposition, contents } = await velho.getAineisto(aineisto.dokumenttiOid);
  const fileName = contentDisposition.parse(disposition).parameters.filename;
  if (!fileName) {
    throw new Error("Tiedoston nimeä ei pystytty päättelemään: '" + disposition + "'");
  }
  const contentType = mime.lookup(fileName);
  const tiedosto = await fileService.createAineistoToProjekti({
    oid,
    path,
    fileName,
    contentType: contentType || undefined,
    inline: true,
    contents,
  });
  return {
    ...aineisto,
    tiedosto,
    tila: AineistoTila.VALMIS,
    tuotu: nyt().format(),
  };
}
