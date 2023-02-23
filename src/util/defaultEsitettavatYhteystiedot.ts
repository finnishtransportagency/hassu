import { StandardiYhteystiedot, StandardiYhteystiedotInput, YhteystietoInput } from "@services/api";

export default function defaultEsitettavatYhteystiedot(
  standardiYhteystiedot: StandardiYhteystiedot | StandardiYhteystiedotInput | null | undefined
): StandardiYhteystiedotInput {
  const yhteysTiedot: YhteystietoInput[] =
    standardiYhteystiedot?.yhteysTiedot?.map<YhteystietoInput>(
      ({ etunimi, puhelinnumero, sahkoposti, sukunimi, organisaatio, titteli, kunta }) => ({
        etunimi,
        puhelinnumero,
        sahkoposti,
        sukunimi,
        organisaatio,
        titteli,
        kunta,
      })
    ) || [];
  const yhteysHenkilot: string[] = standardiYhteystiedot?.yhteysHenkilot || [];
  return {
    yhteysHenkilot,
    yhteysTiedot,
  };
}
