import express from "express";
import * as R from "ramda";
import { init } from "../firebase/firebase-service.js";
import { getClient, verifyUser, getUser, authData } from "./auth_service.js";
import authorize from "./authorize.js";
import login from "./login.js";
import approve from "./approve.js";
import token from "./token.js";

const routerAuth = express.Router();
export default routerAuth;

init();

const authDataValue = await authData();
const authServer = {
  authorizationEndpoint: authDataValue.authorizationEndpoint,
  tokenEndpoint: authDataValue.tokenEndpoint,
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
