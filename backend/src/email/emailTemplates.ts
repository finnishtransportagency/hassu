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
const perustamisOtsikko = template`Valtion liikenneväylien suunnittelu: Uusi projekti perustettu ${"velho.asiatunnusVayla"}`;
const perustamisTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmään on tuotu Projektivelhosta projektisi:
${"velho.nimi"}
Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}
Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const perustamisVastaanottajat = template`${"velho.vastuuhenkilonEmail"}`;

export function createPerustamisEmail(projekti: DBProjekti): EmailOptions {
  const emailOptions: EmailOptions = {
    subject: perustamisOtsikko(projekti),
    text: perustamisTeksti({ domain: domain, ...projekti }),
    to: perustamisVastaanottajat(projekti),
  };

  return emailOptions;
}
