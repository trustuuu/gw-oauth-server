import express from "express";
//const { default: express } = await import("express");
import applicationService from "../service/application-service.js";
import { GuardLeast } from "../../igwGuard.js";
import { generateId } from "../service/remote-path-service.js";
import { createPostHandler, httpRun } from "../helper/httpHandler.js";

const routerApplication = express.Router();
export default routerApplication;

const appPath = "application";
const PermissionScopes = "PermissionScopes";
const TokenExchanges = "TokenExchanges";
const guard = GuardLeast.check(
  [["company:admin"]],
  [["Ops:Admin"], ["tenant:admin"]]
);

routerApplication.get(`/${appPath}/`, guard, (req, res) => {
  if (req.query.condition) {
    httpRun(res, () =>
      applicationService.getApplicationsWhere(
        appPath,
        null,
        null,
        req.query.condition
      )
    );
  } else {
    httpRun(res, () => applicationService.getData(appPath));
  }
});

routerApplication.get(`/${appPath}/:id`, guard, (req, res) => {
  httpRun(res, () => applicationService.getData(appPath, req.params.id));
});

routerApplication.get(
  `/${appPath}/:id/${PermissionScopes}`,
  guard,
  (req, res) => {
    httpRun(res, () =>
      applicationService.getApplicationPermissionScopes(appPath, req.params.id)
    );
  }
);

routerApplication.get(
  `/${appPath}/:id/${TokenExchanges}`,
  guard,
  (req, res) => {
    httpRun(res, () =>
      applicationService.getApplicationTokenExchanges(appPath, req.params.id)
    );
  }
);

routerApplication.get(`/:companyId/application`, guard, (req, res) => {
  if (req.query.condition) {
    httpRun(res, () =>
      applicationService.getApplicationsWhere(
        appPath,
        req.params.companyId,
        null,
        req.query.condition
      )
    );
  } else {
    httpRun(res, () =>
      applicationService.getApplications(appPath, req.params.companyId)
    );
  }
});

routerApplication.get(
  `/:companyId/:domainId/application`,
  guard,
  (req, res) => {
    if (req.query.condition) {
      httpRun(res, () =>
        applicationService.getApplicationsWhere(
          appPath,
          req.params.companyId,
          req.params.domainId,
          req.query.condition
        )
      );
    } else {
      httpRun(res, () =>
        applicationService.getApplications(
          appPath,
          req.params.companyId,
          req.params.domainId
        )
      );
    }
  }
);

routerApplication.post(`/${appPath}/`, guard, (req, res) => {
  const data = {
    ...req.body,
    client_id_created_at: new Date(),
    client_status: "New",
  };
  httpRun(
    res,
    () =>
      applicationService.setData.apply(
        applicationService,
        [data].concat([appPath, data.client_id])
      ),
    undefined,
    undefined,
    data
  );
});

routerApplication.post(
  `/${appPath}/:id/${PermissionScopes}`,
  guard,
  createPostHandler(applicationService, (req) => [
    appPath,
    req.params.id,
    PermissionScopes,
  ])
);

routerApplication.post(
  `/${appPath}/:id/${TokenExchanges}`,
  guard,
  createPostHandler(
    applicationService,
    (req) => [appPath, req.params.id, TokenExchanges],
    {
      generateIdFn: (item) => generateId(item.name),
    }
  )
);

routerApplication.put(`/${appPath}`, guard, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  httpRun(
    res,
    () =>
      applicationService.updateData.apply(
        applicationService,
        [data].concat([appPath, data.id])
      ),
    null,
    null,
    data
  );
});

routerApplication.put(`/${appPath}/:id`, guard, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  httpRun(
    res,
    () =>
      applicationService.updateData.apply(
        applicationService,
        [data].concat([appPath, req.params.id])
      ),
    null,
    null,
    data
  );
});

routerApplication.put(
  `/${appPath}/:id/${PermissionScopes}/:scopeId`,
  guard,
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    httpRun(res, () =>
      applicationService.updateData.apply(
        applicationService,
        [data].concat([
          appPath,
          req.params.id,
          PermissionScopes,
          req.params.scopeId,
        ])
      )
    );
  }
);

routerApplication.put(
  `/${appPath}/:id/${TokenExchanges}/:policyId`,
  guard,
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    httpRun(res, () =>
      applicationService.updateData.apply(
        applicationService,
        [data].concat([
          appPath,
          req.params.id,
          TokenExchanges,
          req.params.policyId,
        ])
      )
    );
  }
);

routerApplication.delete(`/${appPath}/:id`, guard, (req, res) => {
  const data = {};
  httpRun(res, () =>
    applicationService.deleteData.apply(
      applicationService,
      [data].concat([appPath, req.params.id])
    )
  );
});

routerApplication.delete(`/${appPath}`, guard, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return applicationService.deleteData.apply(
      applicationService,
      [null].concat([appPath, item.id])
    );
  });
  httpRun(res, () => Promise.all(allDeletes));
});

routerApplication.delete(
  `/${appPath}/:id/${PermissionScopes}/:scopeId`,
  guard,
  (req, res) => {
    httpRun(res, () =>
      applicationService.deleteData.apply(
        applicationService,
        [null].concat([
          appPath,
          req.params.id,
          PermissionScopes,
          req.params.scopeId,
        ])
      )
    );
  }
);

routerApplication.delete(
  `/${appPath}/:id/${PermissionScopes}`,
  guard,
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return applicationService.deleteData.apply(
        applicationService,
        [null].concat([appPath, req.params.id, PermissionScopes, item.id])
      );
    });
    httpRun(res, () => Promise.all(allDeletes));
  }
);

routerApplication.delete(
  `/${appPath}/:id/${TokenExchanges}/:policyId`,
  guard,
  (req, res) => {
    httpRun(res, () =>
      applicationService.deleteData.apply(
        applicationService,
        [null].concat([
          appPath,
          req.params.id,
          TokenExchanges,
          req.params.policyId,
        ])
      )
    );
  }
);

routerApplication.delete(
  `/${appPath}/:id/${TokenExchanges}`,
  guard,
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return applicationService.deleteData.apply(
        applicationService,
        [null].concat([appPath, req.params.id, TokenExchanges, item.id])
      );
    });
    httpRun(res, () => Promise.all(allDeletes));
  }
);
