exports.handler = (event, _, callback) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  if (headers.cookie) {
    for (const cookie of headers.cookie) {
      const cookies = Object.fromEntries(cookie.value.split("; ").map((v) => v.split(/=(.*)/s).map(decodeURIComponent)));
      if (cookies["x-vls-access-token"]) {
        headers["x-vls-accesstoken"] = [{ key: "x-vls-accesstoken", value: cookies["x-vls-access-token"] }];
        break;
      }
    }
  }
  callback(null, request);
};
