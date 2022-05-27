var readline = require("readline");
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const strings = [];

rl.on("line", function (line) {
  strings.push(line);
});

process.stdin.on("end", () => {
  let data = strings.join("\n");
  let response = JSON.parse(data);
  console.log("StatusCode:" + response.StatusCode);
  console.log("Log:\n" + Buffer.from(response.LogResult, "base64").toString());
});
