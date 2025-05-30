exports.handler = (event, context, callback) => {
  // Get request and request headers
  const request = event.Records[0].cf.request;
  var headers = request.headers;

  // Configure authentication
  var authUser = "${BASIC_USERNAME}";
  var authPass = "${BASIC_PASSWORD}";
  var environment = process.env.ENVIRONMENT || "${ENVIRONMENT}";

  // varruct the Basic Auth string
  var authString = "Basic " + b2a(authUser + ":" + authPass);

  // Require Basic authentication
  if (headers.authorization && headers.authorization.length > 0 && headers.authorization[0].value == authString) {
    // Continue request processing if authentication passed
    callback(null, request);
  } else {
    if (environment === "prod" && (request.uri === "/" || request.uri === "")) {
      // Ohjaa juuresta /etusivu:lle
      callback(null, {
        status: 302,
        statusDescription: "Found",
        headers: {
          location: [
            {
              key: "Location",
              value: "/etusivu/index.html",
            },
          ],
        },
      });
    } else if (
      request.uri.startsWith("/etusivu") ||
      request.uri.startsWith("/oauth2") ||
      request.uri.startsWith("/fonts") ||
      request.uri.startsWith("/assets") ||
      request.uri === "/favicon.ico"
    ) {
      // Etusivu ennen palvelun avaamista yleisölle on suojaamaton.
      // /oauth2 pitää olla avoin, jotta kirjautuminen toimii
      callback(null, request);
    } else {
      // Pyydä kaikkialla muualla Basic Authentication-tunnukset
      callback(null, {
        status: 401,
        statusDescription: "Unauthorized",
        headers: {
          "www-authenticate": [
            {
              key: "www-authenticate",
              value: "Basic",
            },
          ],
        },
      });
    }
  }
};

// prettier-ignore
function b2a(a) {
  var c, d, e, f, g, h, i, j, o, b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", k = 0, l = 0,
    m = "", n = [];
  if (!a) {
    return a;
  }
  do {
    c = a.charCodeAt(k++), d = a.charCodeAt(k++), e = a.charCodeAt(k++), j = c << 16 | d << 8 | e,
      f = 63 & j >> 18, g = 63 & j >> 12, h = 63 & j >> 6, i = 63 & j, n[l++] = b.charAt(f) + b.charAt(g) + b.charAt(h) + b.charAt(i);
  } while (k < a.length);
  return m = n.join(""), o = a.length % 3, (o ? m.slice(0, o - 3) : m) + "===".slice(o || 3);
}
