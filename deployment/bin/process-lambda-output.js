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
  let data = strings.join("\n").trim();

  if (!data) {
    console.error("No input received");
    process.exit(1);
  }

  try {
    let response = JSON.parse(data);
    console.log("StatusCode:" + response.StatusCode);
    console.log("Log:\n" + Buffer.from(response.LogResult || "", "base64").toString());
  } catch (err) {
    console.error("Invalid JSON:");
    console.error(data);
    throw err;
  }
});
