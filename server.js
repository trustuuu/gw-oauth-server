// import { createRequire } from "module";
// const require = createRequire(import.meta.url); // Create a require function
// const cors = require("cors");
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cons from "consolidate";
import routerAuth from "./src/route/routes_auth.js";
import logger from "morgan";
//import { expressjwt } from "express-jwt";
//import guard from "express-jwt-permissions";
import { Guard, GuardLeast } from "./igwGuard.js";
//import jwks from "jwks-rsa";
import compression from "compression";
import dotenv from "dotenv";
dotenv.config();

import routerConnection from "./src/route/connections.js";
import routerDomain from "./src/route/domains.js";
import routerCompany from "./src/route/companys.js";
import routerGroup from "./src/route/groups.js";
import routerUser from "./src/route/users.js";
import routerProvisioning from "./src/route/provisionings.js";
import routerApplication from "./src/route/application.js";
import routerApi from "./src/route/api.js";
import { COMPANY_COLL } from "./src/service/remote-path-service.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session from "express-session";
import { authenticate } from "./jwks.js";
//import { getJwtExpire } from "./src/helper/utils.js";

const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oauth_server_path = path.join(__dirname, "./public/oauth-server");

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["*"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        formAction: ["*"], // ✅ 허용 추가
      },
    },
  })
);

// const Guard = guard({
//   requestProperty: "auth",
//   permissionsProperty: "permissions",
// });

// const jwtCheck = expressjwt({
//   secret: jwks.expressJwtSecret({
//     cache: true,
//     rateLimit: true,
//     jwksRequestsPerMinute: 5,
//     jwksUri: "https://oauth.biocloud.pro/jwks.json",
//   }),
//   audience: "http://unidir.api.igoodworks.com/",
//   issuer: "http://oauth.unidir.igoodworks.com/",
//   algorithms: ["RS256"],
// });

// const jwtCheckService = expressjwt({
//   secret: jwks.expressJwtSecret({
//     cache: true,
//     rateLimit: true,
//     jwksRequestsPerMinute: 5,
//     jwksUri:
//       "https://gw-oauth-server-hcf3ceajdpg2gcbg.canadacentral-01.azurewebsites.net/jwks.json",
//   }),
//   audience: "http://service.unidir.api.igoodworks.com/",
//   issuer: "http://service.oauth.unidir.igoodworks.com/",
//   algorithms: ["RS256"],
// });

if (isProduction) {
  console.log("production");
  app.use(compression());
}

const corsOptions = {
  origin: true, //"http://localhost:3000",
  credentials: true, //access-control-allow-credentials:true
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

// app.get("*", (req, res, next) => {
//   try {
//     const auth = req.headers.authorization || "";
//     const token = auth.replace("Bearer ", "");
//     const expireAt = getJwtExpire(token);

//     console.log(`expire at: ${expireAt.toISOString()}`);
//   } catch (err) {
//     console.log(`error:  ${err.message}`);
//   }
//   next();
// });

try {
  app.use(cookieParser()); // it should be before session
  app.use(
    session({
      secret: "JesusfavorForiGoodWorksInc!",
      resave: false,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    })
  );
  app.use("/oauth/v1", routerAuth);

  app.use(
    `/oauthapi/v1`,
    authenticate,
    Guard.check(["openId"]),
    routerApplication,
    routerApi
  );
  app.use(
    `/v1/${COMPANY_COLL}`,
    authenticate,
    GuardLeast.check([["user:admin"], ["service"]]),
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
const server = app.listen(port || 8080, hostheader, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log(
    "OAuth Authorization Server[%s] is listening at http://%s:%s",
    isProduction ? "PRODUCTION" : "DEV",
    host,
    port
  );
});

/*
// XSRF-TOKEN 생성 함수
const generateXsrfToken = () => {
  return crypto.randomBytes(32).toString('hex'); // 32바이트 길이의 랜덤 토큰 생성
};

// 클라이언트에게 XSRF-TOKEN을 쿠키로 설정하는 미들웨어
app.use((req, res, next) => {
  if (!req.cookies['XSRF-TOKEN']) {
    const token = generateXsrfToken();
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // 클라이언트에서 접근 가능하도록 설정 (JS에서 읽을 수 있도록)
      secure: process.env.NODE_ENV === 'production', // HTTPS 환경에서만 쿠키 사용
      sameSite: 'Strict', // CSRF 공격 방지 위해 SameSite 정책 설정
    });
  }
  next();
});
*/
