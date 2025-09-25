/**
 * Joudutaan säilyttämään tätä tiedostoa toistaiksesi projektin juuressa
 * koska serverless nextjs ei salli middlewarea (build ei onnistu)
 * frontend.Dockerfile hoitaa tiedoston siirtämisen /src hakemistoon kun buildataan imagea
 * 
 * Voidaan siirtää src/ hakemistoon kun serverless saatu pois projektista.
 * 
 * Middleware, joka poistaa frontend-prefixin saapuvista pyynnöistä.
 *
 * Pilviympäristöissä Lambda@Edge tai Cloudfront function lisää prefixin pyyntöihin
 * jotta ei autentikointia vaativa liikenne saadaan Next.js-konttiin.
 *
 * Matcher varmistaa, että middleware suoritetaan vain poluilla, jotka alkavat
 * määritetyllä prefixillä.
 */

import { NextRequest, NextResponse } from "next/server";
import { BaseConfig } from "common/BaseConfig";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const prefix = BaseConfig.frontendPrefix;

  // Turvatarkistus: poista prefiksi vain, jos se on todellisuudessa paikalla
  // Safety check: poista prefix vain jos paikalla
  // ja muuta pyyntö sisäisesti, jotta prefixiä ei näy polussa
  if (url.pathname.startsWith(prefix)) {
    url.pathname = url.pathname.slice(prefix.length) || "/";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [`${BaseConfig.frontendPrefix}/:path*`],
};
