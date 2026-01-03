import swaggerAutogen from "swagger-autogen";
import fs from "fs";

import {
  DOMAIN_COLL,
  COMPANY_COLL,
  AUTH_COLL,
  API_COLL,
  APPLICATION_COLL,
  CODE_COLL,
  REQID_COLL,
  TOKEN_COLL,
  DEVICE_COLL,
  REFRESH_TOKEN_COLL,
  GROUP_COLL,
  USER_COLL,
  PROVISIONING_COLL,
  CONNECTION_COLL,
  API_PATH,
  APP_PATH,
} from "./src/service/remote-path-service.js";
// List all your "Constant" names that Swagger mistake for parameters
const constantNames = [
  "COMPANY_COLL",
  "DOMAIN_COLL",
  "USER_COLL",
  "GROUP_COLL",
  "authorization",
  "AUTH_COLL",
  "API_COLL",
  "APPLICATION_COLL",
  "CODE_COLL",
  "REQID_COLL",
  "TOKEN_COLL",
  "DEVICE_COLL",
  "REFRESH_TOKEN_COLL",
  "PROVISIONING_COLL",
  "CONNECTION_COLL",
  "API_PATH",
  "APP_PATH",
  "appPath",
  "PermissionScopes",
  "TokenExchanges",
  "AppRoles",
  "UsersAndGroups",
  "memberPath",
];

const doc = {
  info: { title: "Universal Directory API", version: "1.0.0" },
  host: "oauth.igoodworks.com",
  schemes: ["https"],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  // This applies security globally to all endpoints
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["./server.js"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc).then(
  async () => {
    console.log("Cleaning up Swagger JSON...");

    try {
      const data = fs.readFileSync(outputFile, "utf8");
      let swaggerObj = JSON.parse(data);

      if (swaggerObj.paths) {
        const filteredPaths = {};

        Object.keys(swaggerObj.paths).forEach((pathKey) => {
          // --- 1. REMOVE ALL LISTS STARTING WITH /oauth/v1 ---
          //   if (pathKey.startsWith("/oauth/v1")) {
          //     return; // Skip this path entirely
          //   }

          // --- 2. CLEAN PARAMETERS FOR REMAINING PATHS ---
          const methods = swaggerObj.paths[pathKey];
          Object.keys(methods).forEach((method) => {
            if (methods[method].parameters) {
              methods[method].parameters = methods[method].parameters.filter(
                (param) => {
                  // Remove if name is a COLL constant or redundant auth header
                  return (
                    !constantNames.includes(param.name) &&
                    param.name.toLowerCase() !== "authorization"
                  );
                }
              );
            }
            // Add global security to the remaining routes
            methods[method].security = [{ bearerAuth: [] }];
          });

          filteredPaths[pathKey] = methods;
        });

        swaggerObj.paths = filteredPaths;
      }

      // 2. Convert back to string and fix the path names
      let swaggerString = JSON.stringify(swaggerObj, null, 2);

      swaggerString = swaggerString.replaceAll("${COMPANY_COLL}", COMPANY_COLL);
      swaggerString = swaggerString.replaceAll("${DOMAIN_COLL}", DOMAIN_COLL);

      swaggerString = swaggerString.replaceAll("${USER_COLL}", USER_COLL);
      swaggerString = swaggerString.replaceAll("${GROUP_COLL}", GROUP_COLL);

      swaggerString = swaggerString.replaceAll("${AUTH_COLL}", AUTH_COLL);
      swaggerString = swaggerString.replaceAll("${API_COLL}", API_COLL);
      swaggerString = swaggerString.replaceAll("${APP_PATH}", APP_PATH);
      swaggerString = swaggerString.replaceAll("${appPath}", APP_PATH);
      swaggerString = swaggerString.replaceAll(
        "${PermissionScopes}",
        "PermissionScopes"
      );
      swaggerString = swaggerString.replaceAll(
        "${TokenExchanges}",
        "TokenExchanges"
      );
      swaggerString = swaggerString.replaceAll("${AppRoles}", "AppRoles");
      swaggerString = swaggerString.replaceAll(
        "${UsersAndGroups}",
        "UsersAndGroups"
      );
      swaggerString = swaggerString.replaceAll("${memberPath}", "members");

      swaggerString = swaggerString.replaceAll(
        "${APPLICATION_COLL}",
        APPLICATION_COLL
      );
      swaggerString = swaggerString.replaceAll(
        "${PROVISIONING_COLL}",
        PROVISIONING_COLL
      );
      swaggerString = swaggerString.replaceAll(
        "${CONNECTION_COLL}",
        CONNECTION_COLL
      );
      swaggerString = swaggerString.replaceAll("${API_PATH}", API_PATH);
      swaggerString = swaggerString.replaceAll(
        "/oauth/v1/authorize",
        "oauth/v1"
      );

      fs.writeFileSync(outputFile, swaggerString);
      console.log("Cleanup complete! 'Parameters' removed and paths updated.");
    } catch (err) {
      console.error("Post-processing failed:", err);
    }
  }
);
