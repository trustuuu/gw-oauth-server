import express from "express";
//const { default: express } = await import("express");
import { init } from "../firebase/firebase-service.js";
import { authData } from "./oauth/auth_service.js";
import authorize from "./oauth/authorize.js";
import {
  getDecryptMfaLink,
  mfaGet,
  mfaImage,
  mfaPost,
  mfaQuery,
  mfaVerify,
} from "./oauth/mfa.js";
import login from "./oauth/login.js";
import approve from "./oauth/approve.js";
import token from "./oauth/token.js";
import callback from "./oauth/callback.js";
import getSession from "./oauth/session.js";
import signup from "./oauth/signup.js";
import { logout } from "./oauth/logout.js";
import { instrospect } from "./oauth/introspect.js";
import { device_authorization } from "./oauth/device_authorization.js";
import { activate } from "./oauth/activate.js";
import { callbackEx } from "./oauth/callbackEx.js";

const routerAuth = express.Router();
export default routerAuth;

init();

const authDataValue = await authData();
const authServer = {
  authorizationEndpoint: authDataValue.authorizationEndpoint,
  tokenEndpoint: authDataValue.tokenEndpoint,
  authorizationEndpointDev: authDataValue.authorizationEndpointDev,
  tokenEndpointDev: authDataValue.tokenEndpointDev,
};

const requests = {};
routerAuth.locals = { ...authServer, requests };

routerAuth.get(`/authorize`, async (req, res) => {
  await authorize(req, res, routerAuth);
});

routerAuth.post(
  "/login",
  async (req, res) => await login(req, res, routerAuth)
);

routerAuth.get(
  "/logout",
  async (req, res) => await logout(req, res, routerAuth)
);

routerAuth.post(
  "/introspect",
  async (req, res) => await instrospect(req, res, routerAuth)
);

routerAuth.post(
  "/device_authorization",
  async (req, res) => await device_authorization(req, res, routerAuth)
);

routerAuth.post(
  "/activate",
  async (req, res) => await activate(req, res, routerAuth)
);

routerAuth.post(
  "/signup",
  async (req, res) => await signup(req, res, routerAuth)
);

routerAuth.post(
  "/approve",
  async (req, res) => await approve(req, res, routerAuth)
);

routerAuth.post(
  "/token",
  async (req, res) => await token(req, res, routerAuth)
);

routerAuth.post(
  "/callback",
  async (req, res) => await callback(req, res, routerAuth)
);

routerAuth.get(
  "/callbackex",
  async (req, res) => await callbackEx(req, res, routerAuth)
);

routerAuth.post(
  "/session",
  async (req, res) => await getSession(req, res, routerAuth)
);

routerAuth.get(`/mfa`, async (req, res) => await mfaGet(req, res, routerAuth));

routerAuth.get(
  `/mfalink`,
  async (req, res) => await mfaQuery(req, res, routerAuth)
);

routerAuth.get(
  `/mfaImage`,
  async (req, res) => await mfaImage(req, res, routerAuth)
);

routerAuth.post(
  `/mfa`,
  async (req, res) => await mfaPost(req, res, routerAuth)
);

routerAuth.post(
  `/verifyTotp`,
  async (req, res) => await mfaVerify(req, res, routerAuth)
);

routerAuth.post(
  `/mfaLinkValue`,
  async (req, res) => await getDecryptMfaLink(req, res, routerAuth)
);
