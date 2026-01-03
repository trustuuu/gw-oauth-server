import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cons from "consolidate";
import routerAuth from "./src/route/routes_auth.js";
import logger from "morgan";

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
import { authenticate, authenticateOptional } from "./jwks.js";
import { decodeClientCredentials } from "./src/helper/utils.js";
import { getClient } from "./src/route/oauth/auth_service.js";
import { GuardLeast } from "./igwGuard.js";
//import { getJwtExpire } from "./src/helper/utils.js";
// import { EventEmitter } from 'events';
// EventEmitter.defaultMaxListeners = 20;

const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const oauth_server_path = path.join(__dirname, "./public/oauth-server");

const app = express();
const hostheader = isProduction ? "" : "0.0.0.0";
const port = isProduction ? process.env.SERVER_PORT : 80;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["*"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        objectSrc: ["'none'"],
        formAction: ["*"],
      },
    },
  })
);

if (isProduction) {
  console.log("production");
  app.use(compression());
} else {
  // ⚡ initialize generator before routes
  // expressOasGenerator.handleResponses(app, {
  //   alwaysServeDocs: true,
  //   tags: ["default"],
  //   specOutputPath: "./openapi.json",
  // });
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
      secret: process.env.COOKIE_SECRET,
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

  const allowedOriginsCache = new Map();
  async function fetchOriginFromDB(origin, req) {
    try {
      let clientId = "";

      const auth = req.headers["authorization"];
      if (auth) {
        const clientCredentials = decodeClientCredentials(auth);
        clientId = clientCredentials.id;
      } else if (req.body.client_id) {
        clientId = req.body.client_id;
      }

      if (!clientId) {
        return true;
      }

      const allowedOrigins = allowedOriginsCache.get(clientId);
      if (
        allowedOrigins &&
        allowedOrigins.some((o) => o === origin || o === "*")
      ) {
        console.log("allowedOrigins from Cache", allowedOrigins);
        return true;
      }

      const client = await getClient(clientId);

      if (!client) return false;
      if (!client.allowed_web_orgins || !client.allowed_web_orgins[0]) {
        console.log(client.client_id, ": allowed_web_orgins set to *");
        allowedOriginsCache.set(client.client_id, ["*"]);
        return true;
      }

      if (client.allowed_web_orgins.some((o) => o === origin)) {
        console.log(
          client.client_id,
          ": allowed_web_orgins set to ",
          client.allowed_web_orgins
        );
        allowedOriginsCache.set(client.client_id, client.allowed_web_orgins);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log(`Checking orgin error: ${error}`);
      return false;
    }
  }

  // app.use(async (req, res, next) => {
  //   try {
  //     const origin = req.headers.origin;

  //     if (!origin) return next();
  //     if (req.path.replace(/\/$/, "") == "/oauth/v1/token") return next();
  //     if (req.path.replace(/\/$/, "") == "/oauth/v1/signup") return next();

  //     const isAllowed = await fetchOriginFromDB(origin.replace(/\/$/, ""), req);
  //     console.log("origin isAllowed", isAllowed);

  //     if (isAllowed) {
  //       res.setHeader("Access-Control-Allow-Origin", origin);
  //     }
  //     res.setHeader("Access-Control-Allow-Credentials", "true");
  //     res.setHeader(
  //       "Access-Control-Allow-Headers",
  //       `Origin, X-Requested-With, Content-Type, Accept, Authorization, ${process.env.DEVICE_ID_HEADER}`
  //     );
  //     res.setHeader(
  //       "Access-Control-Allow-Methods",
  //       "GET, POST, PUT, DELETE, OPTIONS"
  //     );

  //     if (req.method === "OPTIONS") {
  //       console.log("request method is ", req.method);
  //       return res.sendStatus(200); // preflight
  //     }

  //     if (!isAllowed) {
  //       return res.sendStatus(401);
  //     }
  //     return next();
  //   } catch (error) {
  //     console.log(`origin checking error: ${error}`);
  //     return next();
  //   }
  // });

  app.use(async (req, res, next) => {
    try {
      const origin = req.headers.origin;

      // 1. If there's no origin (e.g., server-to-server), just move on
      if (!origin) return next();

      const cleanOrigin = origin.replace(/\/$/, "");
      const cleanPath = req.path.replace(/\/$/, "");

      // 2. Identify "Public" or "Always Allowed" paths
      const isAuthRoute = ["/oauth/v1/token", "/oauth/v1/signup"].includes(
        cleanPath
      );

      // 3. Check DB for the origin
      const isAllowed = await fetchOriginFromDB(cleanOrigin, req);
      console.log(
        `Origin: ${cleanOrigin} | Path: ${cleanPath} | Allowed: ${isAllowed}`
      );

      // 4. SET HEADERS (Do this for EVERY request that has an origin)
      // 4. SET HEADERS
      if (isAllowed || isAuthRoute) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
      }

      // These headers are fine to set globally for the response
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        `Origin, X-Requested-With, Content-Type, Accept, Authorization, ${
          process.env.DEVICE_ID_HEADER || "x-device-id"
        }`
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );

      // 5. & 6. Combined Security & Preflight Handling
      if (!isAllowed && !isAuthRoute) {
        console.warn(`Blocked unauthorized origin: ${origin}`);
        return res.status(403).send("CORS Policy: Origin not allowed.");
      }

      // If we reach here, it IS allowed. Now handle the OPTIONS preflight.
      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }

      return next();
    } catch (error) {
      console.error(`CORS Middleware Error: ${error}`);
      // On error, it's safer to block than to allow
      return res.status(500).send("Internal Server Error during CORS check");
    }
  });

  //app.use("/oauth/v1", cors(corsOptionsDelegate), routerAuth);
  app.use("/oauth/v1", cors(corsOptions), authenticateOptional, routerAuth);
  app.use(
    `/oauthapi/v1`,
    cors(corsOptions),
    authenticate,
    routerApplication,
    routerApi
  );

  app.post(
    `/v1/${COMPANY_COLL}/:companyId/domainNames/:domainId/purge/cors`,
    cors(corsOptions),
    authenticate,
    GuardLeast.check(undefined, [
      ["tenant:admin"],
      ["company:admin"],
      ["Ops:Admin"],
    ]),
    (req, res) => {
      if (req.body.client_id) {
        allowedOriginsCache.delete(req.body.client_id);
      }
      res
        .status(200)
        .json({ message: "Task completed", received: req.body.client_id });
    }
  );

  // const basePath = `/v1/${COMPANY_COLL}`;
  // app.use(basePath, cors(corsOptions), authenticate, routerCompany);
  // app.use(basePath, cors(corsOptions), authenticate, routerDomain);
  // app.use(basePath, cors(corsOptions), authenticate, routerGroup);
  // app.use(basePath, cors(corsOptions), authenticate, routerUser);
  // app.use(basePath, cors(corsOptions), authenticate, routerConnection);
  // app.use(basePath, cors(corsOptions), authenticate, routerProvisioning);
  app.use(
    `/v1/${COMPANY_COLL}`,
    cors(corsOptions),
    authenticate,
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

app.options("/jwks.json", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    `Content-Type, Authorization, ${process.env.DEVICE_ID_HEADER}`
  );
  return res.sendStatus(204);
});

app.get("/jwks.json", (req, res) => {
  const jwksPath = path.join(oauth_server_path, "jwks.json");

  // ✅ PUBLIC RESOURCE — allow any origin
  res.setHeader("Access-Control-Allow-Origin", "*");

  // ❌ DO NOT send credentials for JWKS
  // res.setHeader("Access-Control-Allow-Credentials", "true");

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    `Content-Type, Authorization, ${process.env.DEVICE_ID_HEADER}`
  );

  // ✅ Required by OIDC — allow caching
  res.setHeader("Cache-Control", "public, max-age=3600, immutable");
  res.setHeader("Vary", "Accept-Encoding");

  return res.sendFile(jwksPath);
});


////////////////////////////////////////////////
//Swagger
////////////////////////////////////////////////

import swaggerUi from "swagger-ui-express";
import swaggerDocument from './swagger-output.json' with { type: 'json' };

//app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }'
  })
);
////////////////////////////////////////////////

app.use(express.static(oauth_server_path));
// if (!isProduction) {
//   expressOasGenerator.handleRequests();
// }

app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(oauth_server_path, "index.html"));
});

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

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  // Optionally shut down gracefully
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1); // or trigger graceful shutdown
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
