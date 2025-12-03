import express from "express";
//const { default: express } = await import("express");
import applicationService from "../service/application-service.js";
import { GuardLeast } from "../../igwGuard.js";
import { generateId } from "../service/remote-path-service.js";
import {
  httpDeleteHandler,
  httpGetHandler,
  httpPostHandler,
  httpPutHandler,
  httpRun,
} from "../helper/httpHandler.js";

const routerApplication = express.Router();
export default routerApplication;

const buildNewApplication = (body) => ({
  ...body,
  client_id_created_at: new Date(),
  client_status: "New",
});

const buildNewPermissionScope = (data) => ({
  ...data,
  whenCreated: new Date(),
  status: "New",
});

const buildNewTokenExchange = (data) => ({
  ...data,
  id: generateId(data.name),
  whenCreated: new Date(),
  status: "New",
});

const guard = GuardLeast.check(
  [["company:admin"]],
  [["Ops:Admin"], ["tenant:admin"]]
);

routerApplication.get(`/application`, guard, (req, res) => {
  if (req.query.condition) {
    httpRun(res, () =>
      applicationService.getApplicationsWhere(
        "application",
        null,
        null,
        req.query.condition
      )
    );
  } else {
    httpRun(res, () => applicationService.getData("application"));
  }
});

routerApplication.get(
  `/application/:id`,
  guard,
  httpGetHandler(
    () => applicationService.getData,
    (req) => ["application", req.params.id]
  )
);

routerApplication.get(
  `/application/:id/PermissionScopes`,
  guard,
  httpGetHandler(applicationService.getApplicationPermissionScopes, (req) => [
    "application",
    req.params.id,
  ])
);

routerApplication.get(
  `/application/:id/TokenExchanges`,
  guard,
  httpGetHandler(applicationService.getApplicationTokenExchanges, (req) => [
    "application",
    req.params.id,
  ])
);

// company scope
routerApplication.get(`/:companyId/application`, guard, (req, res) => {
  if (req.query.condition) {
    httpRun(res, () =>
      applicationService.getApplicationsWhere(
        "application",
        req.params.companyId,
        null,
        req.query.condition
      )
    );
  } else {
    httpRun(res, () =>
      applicationService.getApplications("application", req.params.companyId)
    );
  }
});

// domain scope
routerApplication.get(
  `/:companyId/:domainId/application`,
  guard,
  (req, res) => {
    if (req.query.condition) {
      httpRun(res, () =>
        applicationService.getApplicationsWhere(
          "application",
          req.params.companyId,
          req.params.domainId,
          req.query.condition
        )
      );
    } else {
      httpRun(res, () =>
        applicationService.getApplications(
          "application",
          req.params.companyId,
          req.params.domainId
        )
      );
    }
  }
);

//
// -----------------------------------------------------
// POST ROUTES
// -----------------------------------------------------
//

// Create new application
routerApplication.post(
  `/application`,
  guard,
  httpPostHandler(applicationService.setData, buildNewApplication, () => [
    "application",
  ])
);

// PermissionScopes bulk/single
routerApplication.post(
  `/application/:id/PermissionScopes`,
  guard,
  httpPostHandler(
    applicationService.setData,
    buildNewPermissionScope,
    (req) => ["application", req.params.id, "PermissionScopes"]
  )
);

// TokenExchanges bulk/single
routerApplication.post(
  `/application/:id/TokenExchanges`,
  guard,
  httpPostHandler(applicationService.setData, buildNewTokenExchange, (req) => [
    "application",
    req.params.id,
    "TokenExchanges",
  ])
);

//
// -----------------------------------------------------
// PUT ROUTES
// -----------------------------------------------------
routerApplication.put(
  `/application`,
  guard,
  httpPutHandler(applicationService.updateData, () => ["application"])
);

routerApplication.put(
  `/application/:id`,
  guard,
  httpPutHandler(applicationService.updateData, (req) => [
    "application",
    req.params.id,
  ])
);

routerApplication.put(
  `/application/:id/PermissionScopes/:scopeId`,
  guard,
  httpPutHandler(applicationService.updateData, (req) => [
    "application",
    req.params.id,
    "PermissionScopes",
    req.params.scopeId,
  ])
);

routerApplication.put(
  `/application/:id/TokenExchanges/:policyId`,
  guard,
  httpPutHandler(applicationService.updateData, (req) => [
    "application",
    req.params.id,
    "TokenExchanges",
    req.params.policyId,
  ])
);

//
// -----------------------------------------------------
// DELETE ROUTES
// -----------------------------------------------------
routerApplication.delete(
  `/application/:id`,
  guard,
  httpDeleteHandler(applicationService.deleteData, (req) => [
    "application",
    req.params.id,
  ])
);

routerApplication.delete(
  `/application`,
  guard,
  httpDeleteHandler(applicationService.deleteData, () => ["application"])
);

routerApplication.delete(
  `/application/:id/PermissionScopes/:scopeId`,
  guard,
  httpDeleteHandler(applicationService.deleteData, (req) => [
    "application",
    req.params.id,
    "PermissionScopes",
    req.params.scopeId,
  ])
);

routerApplication.delete(
  `/application/:id/PermissionScopes`,
  guard,
  httpDeleteHandler(applicationService.deleteData, (req) => [
    "application",
    req.params.id,
    "PermissionScopes",
  ])
);

routerApplication.delete(
  `/application/:id/TokenExchanges/:policyId`,
  guard,
  httpDeleteHandler(applicationService.deleteData, (req) => [
    "application",
    req.params.id,
    "TokenExchanges",
    req.params.policyId,
  ])
);

routerApplication.delete(
  `/application/:id/TokenExchanges`,
  guard,
  httpDeleteHandler(applicationService.deleteData, (req) => [
    "application",
    req.params.id,
    "TokenExchanges",
  ])
);
