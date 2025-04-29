import express from "express";
//const { default: express } = await import("express");
import { init } from "../firebase/firebase-service.js";
import { authData } from "./oauth/auth_service.js";
import authorize from "./oauth/authorize.js";
import login from "./oauth/login.js";
import approve from "./oauth/approve.js";
import token from "./oauth/token.js";
import callback from "./oauth/callback.js";
import getSession from "./oauth/session.js";

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
routerAuth.get(
  `/authorize`,
  async (req, res) => await authorize(req, res, routerAuth)
);

routerAuth.post(
  "/login",
  async (req, res) => await login(req, res, routerAuth)
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

routerAuth.post(
  "/session",
  async (req, res) => await getSession(req, res, routerAuth)
);
