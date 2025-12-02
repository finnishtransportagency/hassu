import ExternalLinkkiLista from "@components/kansalainen/tietoaPalvelusta/ExternalLinkkiLista";
import TietoaPalvelustaPageLayout from "@components/kansalainen/tietoaPalvelusta/TietoaPalvelustaPageLayout";
import ContentSpacer from "@components/layout/ContentSpacer";
import { isEvkAktivoitu } from "common/util/isEvkAktivoitu";
import React from "react";

export default function DiehtuPlanemisSivu() {
  return (
    <TietoaPalvelustaPageLayout>
      <ContentSpacer as={"section"} gap={8}>
        <h1 id="mainPageContent">Diehtu plánemis</h1>
        <p className="vayla-label">
          Stáhta johtalusfávlliid plánen -bálvalusas siidu lea riikkavuložiid, čanusjoavkkuid ja virgeoapmahaččaid gaskasaš eanageainnuid ja
          ruovdemáđijaid lágas ásahuvvon plánaid vuorrováikkuhuskanála. Lágas ásahuvvon plánat leat oppalašplána, geaidnoplána ja
          raŧŧeplána.
        </p>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">Plánema muttut</h2>
          <p>
            Riikkavuložis lea vejolašvuohta oažžut dieđu ja addit oaivilis plánas Stáhta johtalusfávlliid plánen bálvalusa -bokte. Bálvalus
            dahká vuorrováikkuhuskanála plána gárvvisteaddjiid ja riikkavuložiid gaskii plánema sierra muttuin.
          </p>
          <p>Geaidno- ja raŧŧefidnuid plánema muttut:</p>
          <ol>
            <li>1) álggahangulaheapmi</li>
            <li>2) plánenmuddu</li>
            <li>3) plánat oaidninláhkái</li>
            <li>4) dohkkehanmeannudeamis</li>
            <li>5) dohkkehuvvon</li>
          </ol>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">Plánafidnuid ovdáneapmi</h2>
          <p>
            Plánema dialoga bistá álggahangullamis plána dohkkeheami rádjai. Sáhtát jearrat fidnuin lassedieđuid ja addit máhcahaga oppa
            plánema áigge. Plánas vástideaddjiid oktavuođadieđut leat bálvalusas guđege plána iežas siidduin.
          </p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">Álggahangulaheapmi</h3>
          <p>
            Álggahangulahemiin almmuhat plána álggaheamis ja plána gárvvisteaddji oažžu vuoigatvuođa dahkat plánenguovllu giddodagas plánema
            gáibidan eanabargguid ja – dutkamušaid. Giddodaga oamasteaddjis lea vuoigatvuohta leat báikki alde dutkamušain.
          </p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">Plánenmuddu</h3>
          <p>
            Plánenmuttus riikkavuložat sáhttet oahpásmuvvat plánaevttohusaide. Plánii oahpásmuvvama sáhttá ordnet sierra vugiiguin, omd
            neahtas dahje sierra vuorrováikkuhusdilálašvuohtan.
          </p>
          <p>
            Riikkavuložis lea vejolašvuohta háleštit plánamuttus lean plánas njuolga plána gárvvisteaddjiiguin. Stáhta johtalusfávlliid
            plánen -bálvalusa bokte lea vejolaš jearrat ja addit máhcahaga plánas skovi vehkiin. Jearaldagat ja kommeanttat doaimmahuvvojit
            njuolga plána gárvvisteaddjiide. Plána áigge ožžojuvvon máhcahat gieđahallojuvvo plánema áigge ja dat sáhttá váikkuhit
            plánačovdosiidda.
          </p>
          <p>
            Máhcahatskovvi lea suomagielat, máhcahaga sáhttá addit maiddái sáddemiin šleađgapoastta prošeaktaoaivámužžii.
            Prošeaktaoaivámučča šleađgapoasta lea bovdehusa pdf-fiillas.
          </p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">Plánat oaidninláhkái</h3>
          <p>Plánat oaidninláhkái ásaheapmi oaivvilda dan, ahte plána lea gárvvisteaddji beales gárvvis.</p>
          <p>
            Go plánat leat gárvát, plána gárvvisteaddji ásaha plána oaidninláhkái. Plánaide sáhttá oahpásmuvvat Stáhta johtalusfávlliid
            plánen –bálvalusas ja plánain lea vejolaš dahkat muittuhusa bálvalusa bokte plána oaidninláhkáiáiggis. Muittuhusat
            stivrejuvvojit virgeoapmahačča registrerenkantuvrii. Plána gárvvisteaddji addá muittuhusa vuođul vástádusas plána
            dohkkehanmearrádusas. Seammá maiddái gielda addá vástádusas gieldda olbmuid guođđán muittuhusaide.
          </p>
          <p>
            Muittuhusskovvi lea suomagielat, muittuhusa sáhttá guođđit maiddái sáddemiin šleađgapoastta plánemis vástideaddji
            virgeoapmahačča registrerenkantuvrii. Registrerenkantuvrra šleađgapoastačujuhus gávdno gulahusa pdf-fiillas.
          </p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">Dohkkehanmeannudeamis</h3>
          <p>
            Dohkkehanmeannudeapmái sirdáseapmi oaivvilda dan, plána oaidninláhkáiáigi lea nohkan. Plána gárvvisteaddji gieđahallá
            oaidninláhkáiáiggi áigge boahtán muittuhusat sihke cealkámušat ja sáhttá daid vuođul rievdadit plána. Mearkkašahtti nuppástusain
            leat oktavuođas báliide, maidda nuppástus váikkuha. Nuppástusat oidnojit dohkkehuvvon plánas. Loahppagieđahallama maŋŋá plána
            gárvvisteaddji sádde plána Johtalus- ja gulahallandoaimmahat Traficom dohkkeheapmin. Dohkkeheapmái gollan áigi ii leat
            ovddalgihtii dieđus.
          </p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h3 className="vayla-subtitle">Dohkkehuvvon</h3>
          <p>
            Johtalus- ja gulahallandoaimmahat Traficom dahká plánas dohkkehanmeannudeapmi, man maŋŋá plána gárvvisteaddji addá mearrádusa
            almmolaččat diehtun gulahallama almmustettiin.
          </p>
          <p>
            Gulahusa almmustahttimis álgá mearrádusa nuppástusohcanáigi. Johtalus- ja gulahallandoaimmahat Traficom dahkan mearrádussii
            sáhttá ohcat nuppástusa váidalemiin áššis hálddahusriektái. Rávvagat váidalusa dahkamii leat dohkkehanmearrádusa oktavuođas lean
            váiddačujuhusas. Gulahus, plána dohkkehanmearrádus ja mearrádusa ággan lean áššegirjjit dollojuvvojit almmolaččat oaidninláhkái
            Stáhta johtalus
          </p>
          <p>
            Plána oažžu lága fámu, jus plánas eai leat nuppástusohcanáiggi dahkkojuvvon váidagat hálddahusriektái. Plána lea fámus njeallje
            jagi. Plána dohkkehanmearrádusa fámusleahkináiggi sáhttá dárbu mielde joatkit guktii, álo njeallje jagi háválassii.
          </p>
        </ContentSpacer>
        <ContentSpacer gap={4}>
          <h2 className="vayla-title">Gulahussiiddut</h2>
          <p>
            {isEvkAktivoitu()
              ? "Stáhta johtalusfávlliid plánen –bálvalusa lassin dieđut almmustahtton gulahusain ja bovdehusain vuorrováikkuhussii leat Fávledoaimmahaga, Eallinfápmoguovddáža ja plánenguovllu gielddaid neahttasiidduin. Lassin dieđut gulahusain ja bovdehusain vuorrováikkuhussii almmustahttojuvvojit maiddái ovtta dahje máŋgga plánenguovllus almmustuvvan bláđis."
              : "Stáhta johtalusfávlliid plánen –bálvalusa lassin dieđut almmustahtton gulahusain ja bovdehusain vuorrováikkuhussii leat Fávledoaimmahaga, Ealáhus-, johtalus- ja birasguovddáža ja plánenguovllu gielddaid neahttasiidduin. Lassin dieđut gulahusain ja bovdehusain vuorrováikkuhussii almmustahttojuvvojit maiddái ovtta dahje máŋgga plánenguovllus almmustuvvan bláđis."}
          </p>
          <p>Liŋkkat plánas vástidan gulahussiidduide</p>
          <ExternalLinkkiLista
            linkkiTiedot={[
              {
                href: "https://www.vayla.fi/tietoa-meista/ajankohtaista/kuulutukset",
                teksti: "Fávledoaimmahaga gulahussiiddut",
              },
              isEvkAktivoitu()
                ? {
                    href: "https://www.elinvoimakeskus.fi/kuulutukset",
                    teksti: "Guvllolaš Eallinfápmoguovddáža gulahussiiddut (olgguldas liŋka)",
                  }
                : {
                    href: "https://www.ely-keskus.fi/kuulutukset",
                    teksti: "Guvllolaš ealáhus-, johtalus- ja birasguovddáža gulahussiiddut (olgguldas liŋka)",
                  },
            ]}
          />
        </ContentSpacer>
      </ContentSpacer>
    </TietoaPalvelustaPageLayout>
  );
}
