import app from "./app.js"; // Your Express app
// import https from "https";
// import fs from "fs";

// const sslOption = {
//     key: fs.readFileSync("./localhost-key.pem"), // Path to your key file
//     cert: fs.readFileSync("./localhost.pem"),     // Path to your certificate file
// };

const PORT = process.env.PORT || 3000;

// const server = https.createServer(sslOption, app);

app.listen(PORT, () => {
    console.log(`Server Running On Port: ${PORT}`);
});
