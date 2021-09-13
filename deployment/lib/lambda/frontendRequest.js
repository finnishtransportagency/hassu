function handler (event) {
  // Get request and request headers
  var request = event.request;
  var headers = request.headers;

  // Configure authentication
  var authUser = "${BASIC_USERNAME}";
  var authPass = "${BASIC_PASSWORD}";

  // varruct the Basic Auth string
  var authString = "Basic " + b2a(authUser + ":" + authPass);

  // Require Basic authentication
  if (typeof headers.authorization == "undefined" || headers.authorization.value != authString) {
    return {
      statusCode: 401,
      statusDescription: "Unauthorized",
      headers: {
        "www-authenticate": {value: "Basic" }
      },
    };
  }

  // Continue request processing if authentication passed
  return request;
}


function b2a(a) {
  var c, d, e, f, g, h, i, j, o, b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", k = 0, l = 0, m = "", n = [];
  if (!a) return a;
  do c = a.charCodeAt(k++), d = a.charCodeAt(k++), e = a.charCodeAt(k++), j = c << 16 | d << 8 | e,
    f = 63 & j >> 18, g = 63 & j >> 12, h = 63 & j >> 6, i = 63 & j, n[l++] = b.charAt(f) + b.charAt(g) + b.charAt(h) + b.charAt(i); while (k < a.length);
  return m = n.join(""), o = a.length % 3, (o ? m.slice(0, o - 3) :m) + "===".slice(o || 3);
}
