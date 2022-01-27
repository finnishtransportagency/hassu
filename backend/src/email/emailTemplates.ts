import { get } from "lodash";
import { config } from "../config";
import { DBProjekti } from "../database/model/projekti";
import { EmailOptions } from "./email";

function template(strs: TemplateStringsArray, ...exprs: string[]) {
  return function (obj: any) {
    let result = [strs[0]];
    exprs.forEach(function (key, i) {
      let value = get(obj, key);
      result.push(value, strs[i + 1]);
    });
    return result.join("");
  };
}

const domain = config.frontendDomainName || "vayliensuunnittelu.fi";
const perustamisOtsikko = template`Väylien suunnittelu: Uusi projekti perustettu ${"velho.asiatunnusVayla"}`;
const perustamisTeksti = template`Väylien suunnittelu -järjestelmään on tuotu Velhosta projektisi:
${"velho.nimi"}
Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}`;
const perustamisVastaanottajat = template`${"velho.vastuuhenkilonEmail"}`;

export function createPerustamisEmail(projekti: DBProjekti): EmailOptions {
  const emailOptions: EmailOptions = {
    subject: perustamisOtsikko(projekti),
    text: perustamisTeksti({ domain: domain, ...projekti }),
    to: perustamisVastaanottajat(projekti),
  };

  return emailOptions;
}
