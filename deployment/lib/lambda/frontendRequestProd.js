function handler(event) {
  var request = event.request;

  var prefix = "${PREFIX}";

  var uri = request.uri;

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
  return request;
}
