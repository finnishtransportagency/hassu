exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const prefix = "${PREFIX}";

  // Add prefix if not already present
  if (!request.uri.startsWith(prefix)) {
    request.uri = prefix + request.uri;
  }

  callback(null, request);
};
