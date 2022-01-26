import { get } from "lodash";
import { DBProjekti } from "../database/model/projekti";
import { EmailOptions } from "./email";

function template(strs: TemplateStringsArray, ...exprs: string[]) {
  return function (projekti: DBProjekti) {
    let result = [strs[0]];
    exprs.forEach(function (key, i) {
      let value = get(projekti, key);
      result.push(value, strs[i + 1]);
    });
    return result.join("");
  };
}

const perustamisOtsikko = template`Väylien suunnittelu: Uusi projekti perustettu ${"velho.asiatunnusVayla"}`;
const perustamisTeksti = template`Väylien suunnittelu -järjestelmään on tuotu Velhosta projektisi:
${"velho.nimi"}
Voit tarkastella projektia osoitteessa https://hassudev.testivaylapilvi.fi/yllapito/projekti/${"oid"}`;
const perustamisVastaanottajat = template`${"velho.vastuuhenkilonEmail"}`;

export function createPerustamisEmail(projekti: DBProjekti): EmailOptions {
  const emailOptions: EmailOptions = {
    subject: perustamisOtsikko(projekti),
    text: perustamisTeksti(projekti),
    to: perustamisVastaanottajat(projekti),
  };

  return emailOptions;
}
