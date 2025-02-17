import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cons from "consolidate";
import routerAuth from "./src/route/routes_auth.js";

import dotenv from "dotenv";
dotenv.config(); //{ path: ".env.development" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oauth_server_path = path.join(__dirname, "./oauth-server/dist");

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support form-encoded bodies (for the token endpoint)
app.use(bodyParser.json());

app.engine("html", cons.underscore);
app.set("view engine", "html");
app.set("views", oauth_server_path);
app.set("json spaces", 4);

app.use("/oauth/", routerAuth);

//app.use("/oauth/", routerAuth);
app.use(express.static(oauth_server_path));
app.get("*", (req, res) => {
  res.sendFile(path.join(oauth_server_path, "index.html"));
});

const server = app.listen(process.env.SERVER_PORT || 9001, "localhost", () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(
    "OAuth Authorization Server is listening at http://%s:%s",
    host,
    port
  );
});

// app.use((req, res) => {
//   res.status(200).send("Hello, world!");
// });
// // Start the server
// const PORT = process.env.PORT || 8080;
// app.listen(PORT, () => {
//   console.log(`App listening on port ${PORT}`);
//   console.log("Press Ctrl+C to quit.");
// });
