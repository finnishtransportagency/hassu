import { get } from "lodash";
import { config } from "../config";
import { DBProjekti } from "../database/model/projekti";
import { EmailOptions } from "./email";

function template(strs: TemplateStringsArray, ...exprs: string[]) {
  return function (obj: any) {
    const result = [strs[0]];
    exprs.forEach(function (key, i) {
      const value = get(obj, key);
      result.push(value, strs[i + 1]);
    });
    return result.join("");
  };
}

const domain = config.frontendDomainName || "vayliensuunnittelu.fi";
// Projektin perustaminen
const perustamisOtsikko = template`Valtion liikenneväylien suunnittelu: Uusi projekti perustettu ${"velho.asiatunnusVayla"}`;
const perustamisTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmään on tuotu Projektivelhosta projektisi:
${"velho.nimi"}
Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}
Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const perustamisVastaanottajat = template`${"velho.vastuuhenkilonEmail"}`;
// Aloituskuulutuksen hyvaksymispyynto
const hyvaksyttavanaOtsikko = template`Valtion liikenneväylien suunnittelu: Aloituskuulutus odottaa hyväksyntää ${"velho.asiatunnusVayla"}`;
const hyvaksyttavanaTeksti = template`Valtion liikenneväylien suunnittelu -järjestelmän projektistasi
${"velho.nimi"}
on luotu aloituskuulutus, joka odottaa hyväksyntääsi.
Voit tarkastella projektia osoitteessa https://${"domain"}/yllapito/projekti/${"oid"}
Saat tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.`;
const hyvaksyttavanaVastaanottajat = template`${"velho.vastuuhenkilonEmail"}`;

export function createPerustamisEmail(projekti: DBProjekti): EmailOptions {
  return {
    subject: perustamisOtsikko(projekti),
    text: perustamisTeksti({ domain, ...projekti }),
    to: perustamisVastaanottajat(projekti),
  };
}

export function createHyvaksyttavanaEmail(projekti: DBProjekti): EmailOptions {
  return {
    subject: hyvaksyttavanaOtsikko(projekti),
    text: hyvaksyttavanaTeksti({ domain, ...projekti }),
    to: hyvaksyttavanaVastaanottajat(projekti),
  };
}
