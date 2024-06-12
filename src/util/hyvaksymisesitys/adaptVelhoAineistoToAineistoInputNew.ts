import { AineistoInputNew, VelhoAineisto } from "@services/api";
import { uuid } from "common/util/uuid";

export function adaptVelhoAineistoToAineistoInputNew(velhoAineisto: VelhoAineisto): AineistoInputNew {
  const { oid, tiedosto } = velhoAineisto;
  return {
    dokumenttiOid: oid,
    nimi: tiedosto,
    uuid: uuid.v4(),
  };
}
