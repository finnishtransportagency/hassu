import { config } from "../../../config";
import { generateAndStreamZipfileToS3 } from "../../../tiedostot/zipFiles";
import { Aineisto, LadattuTiedosto } from "../../../database/model";
import { AineistoTila, Kieli, LadattuTiedostoTila } from "hassu-common/graphql/apiModel";
import { AineistoKategoria, aineistoKategoriat } from "hassu-common/aineistoKategoriat";
import { translate } from "../../../util/localization";

type ZipInfo = {
  zipFolder?: string;
};
export type TiedostoToZip = (Aineisto & ZipInfo) | (LadattuTiedosto & ZipInfo);

export async function zipAineistot({
  tiedostotToZip,
  zipFileS3Key,
  yllapitoFullPath,
}: {
  tiedostotToZip: TiedostoToZip[];
  zipFileS3Key: string;
  yllapitoFullPath: string;
}): Promise<void> {
  const filesToZip = tiedostotToZip
    .filter((tiedosto) => tiedosto.tila == LadattuTiedostoTila.VALMIS || tiedosto.tila == AineistoTila.VALMIS)
    .map((tiedosto) => {
      const zipFolder = tiedosto.zipFolder ?? getZipFolder((tiedosto as Aineisto)?.kategoriaId);
      return { s3Key: yllapitoFullPath + tiedosto.tiedosto, zipFolder };
    });

  await generateAndStreamZipfileToS3(config.yllapitoBucketName, filesToZip, zipFileS3Key);
}

export function getZipFolder(kategoriaId: string | undefined | null): string | undefined {
  if (!kategoriaId) {
    return undefined;
  }
  let path = "";
  let category: AineistoKategoria | undefined = aineistoKategoriat.findById(kategoriaId);
  while (category) {
    path = translate("aineisto-kategoria-nimi." + category.id, Kieli.SUOMI) + "/" + path;
    category = category.parentKategoria;
  }
  return path;
}
