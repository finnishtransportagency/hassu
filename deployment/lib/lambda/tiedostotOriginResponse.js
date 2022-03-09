exports.handler = (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  let timestampHeader = headers["x-amz-meta-publication-timestamp"];
  if (timestampHeader && timestampHeader[0] && timestampHeader[0].value) {
    const timestamp = timestampHeader[0].value;
    const publicationTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    if (now < publicationTime) {
      return callback(null, {
        status: "404",
        body: "",
        headers: {
          Expires: [{ key: "Expires", value: new Date(timestamp).toUTCString() }],
        },
      });
    }
    delete response.headers["x-amz-meta-publication-timestamp"];
  }

  callback(null, response);
};
