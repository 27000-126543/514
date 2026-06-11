const fs = require("fs");
const path = require("path");

function writeFile(relativePath, content) {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.writeFileSync(fullPath, content, "utf8");
  console.log("Written:", relativePath);
}

module.exports = { writeFile };
