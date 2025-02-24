import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cons from "consolidate";
import routerAuth from "./src/route/routes_auth.js";
import logger from "morgan";
import { expressjwt } from "express-jwt";
import guard from "express-jwt-permissions";
import jwks from "jwks-rsa";
import compression from "compression";
import dotenv from "dotenv";
dotenv.config(); //{ path: ".env.development" });

import routerConnection from "./src/route/connections.js";
import routerDomain from "./src/route/domains.js";
import routerCompany from "./src/route/companys.js";
import routerGroup from "./src/route/groups.js";
import routerUser from "./src/route/users.js";
import routerProvisioning from "./src/route/provisionings.js";
import routerApplication from "./src/route/application.js";
import routerApi from "./src/route/api.js";
import { COMPANY_COLL } from "./src/service/remote-path-service.js";

const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oauth_server_path = path.join(__dirname, "./oauth-server/public");

const app = express();

const Guard = guard({
  requestProperty: "auth",
  permissionsProperty: "permissions",
});

const jwtCheck = expressjwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri:
      "https://gw-oauth-server-hcf3ceajdpg2gcbg.canadacentral-01.azurewebsites.net/jwks.json",
  }),
  audience: "http://unidir.api.igoodworks.com/",
  issuer: "http://oauth.unidir.igoodworks.com/",
  algorithms: ["RS256"],
});

const jwtCheckService = expressjwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri:
      "https://gw-oauth-server-hcf3ceajdpg2gcbg.canadacentral-01.azurewebsites.net/jwks.json",
  }),
  audience: "http://service.unidir.api.igoodworks.com/",
  issuer: "http://service.oauth.unidir.igoodworks.com/",
  algorithms: ["RS256"],
});

if (isProduction) {
  console.log("production");
  app.use(compression());
}

const corsOptions = {
  origin: "http://localhost:3000",
  //credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(logger("dev"));

app.use(bodyParser.urlencoded({ extended: true })); // support form-encoded bodies (for the token endpoint)
app.use(bodyParser.json());

app.engine("html", cons.underscore);
app.set("view engine", "html");
app.set("views", oauth_server_path);
app.set("json spaces", 4);

try {
  app.use("/oauth/", routerAuth);

  app.use(
    `/oauthapi/`,
    jwtCheck,
    Guard.check(["openId"]),
    routerApplication,
    routerApi
  );
  app.use(
    `/api/${COMPANY_COLL}`,
    jwtCheck,
    Guard.check([["user:admin"], ["service"]]),
    routerCompany,
    routerDomain,
    routerGroup,
    routerUser,
    routerConnection,
    routerProvisioning
  );
} catch (error) {
  console.log("authentication retuns error:", error);
}

app.use(express.static(oauth_server_path));
app.get("*", (req, res) => {
  res.sendFile(path.join(oauth_server_path, "index.html"));
});

const hostheader = isProduction ? "" : "localhost";
const port = isProduction ? process.env.SERVER_PORT : 80;
console.log("hostheader, port, isProduction", hostheader, port, isProduction);
const server = app.listen(port || 8080, hostheader, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(
    "OAuth Authorization Server is listening at http://%s:%s",
    host,
    port
  );
});
