const msamc = require("..").default;

new msamc("207b1cbf-d537-40cb-a8ff-dea3ca80ae28")
  .Authenticate()
  .then(console.log)
  .catch(console.error);
