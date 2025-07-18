exports.handler = (event, context, callback) => {
  // Get request and request headers
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Configure authentication
  const authUser = "${BASIC_USERNAME}";
  const authPass = "${BASIC_PASSWORD}";

  const prefix = "${PREFIX}";

  // varruct the Basic Auth string
  const authString = "Basic " + b2a(authUser + ":" + authPass);

  let uri = request.uri;

  // Normalize: remove trailing slash (except root)
  if (uri.length > 1 && uri.endsWith("/")) {
    uri = uri.slice(0, -1);
  }

  // Rewrite root to prefix
  if (uri === "" || uri === "/") {
    uri = prefix;
  }

  // Add prefix if not already present
  if (!uri.startsWith(prefix)) {
    uri = prefix + uri;
  }

  request.uri = uri;

  // Require Basic authentication
  if (headers.authorization && headers.authorization.length > 0 && headers.authorization[0].value == authString) {
    // Continue request processing if authentication passed
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
