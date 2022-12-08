//
exports.handler = (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  function parseTimestampHeader(headerName) {
    let timestampHeader = headers[headerName];
    delete response.headers[headerName];

    if (timestampHeader && timestampHeader[0] && timestampHeader[0].value) {
      const timestamp = timestampHeader[0].value;
      return new Date(timestamp).getTime();
    }
  }

  let publicationTime = parseTimestampHeader("x-amz-meta-publication-timestamp");
  let expirationTime = parseTimestampHeader("x-amz-meta-expiration-timestamp");
  const now = new Date().getTime();
  if (publicationTime && now < publicationTime) {
    return callback(null, {
      status: "404",
      body: "",
      headers: {
        Expires: [{ key: "Expires", value: new Date(publicationTime).toUTCString() }],
      },
    });
  } else if (expirationTime) {
    if (expirationTime < now) {
      return callback(null, {
        status: "404",
        body: "",
      });
    }
    response.headers.Expires = [{ key: "Expires", value: new Date(expirationTime).toUTCString() }];
  }

  callback(null, response);
};
