import { IllegalArgumentError } from "hassu-common/error";
import { DBProjekti } from "../database/model";
import hyvaksymisEsitysVaiheOnAktiivinen from "./vaiheOnAktiivinen";

export async function validateVaiheOnAktiivinen(projekti: DBProjekti) {
  if (!(await hyvaksymisEsitysVaiheOnAktiivinen(projekti))) {
    throw new IllegalArgumentError("Projektin hyväksymisesitysvaihe ei ole aktiivinen");
  }
}
