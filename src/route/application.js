import express from "express";
//const { default: express } = await import("express");
import applicationService from "../service/application-service.js";
import { GuardLeast } from "../../igwGuard.js";

const routerApplication = express.Router();
export default routerApplication;

const appPath = "application";
const PermissionScopes = "PermissionScopes";

routerApplication.get(
  `/${appPath}/`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        applicationService.getApplicationsWhere(
          appPath,
          null,
          null,
          req.query.condition
        )
      );
    } else {
      run(res, () => applicationService.getData(appPath));
    }
  }
);

routerApplication.get(
  `/${appPath}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => applicationService.getData(appPath, req.params.id));
  }
);

routerApplication.get(
  `/${appPath}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      applicationService.getApplicationPermissionScopes(appPath, req.params.id)
    );
  }
);

routerApplication.get(
  `/:companyId/application`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        applicationService.getApplicationsWhere(
          appPath,
          req.params.companyId,
          null,
          req.query.condition
        )
      );
    } else {
      run(res, () =>
        applicationService.getApplications(appPath, req.params.companyId)
      );
    }
  }
);

routerApplication.get(
  `/:companyId/:domainId/application`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        applicationService.getApplicationsWhere(
          appPath,
          req.params.companyId,
          req.params.domainId,
          req.query.condition
        )
      );
    } else {
      run(res, () =>
        applicationService.getApplications(
          appPath,
          req.params.companyId,
          req.params.domainId
        )
      );
    }
  }
);

routerApplication.post(
  `/${appPath}/`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = {
      ...req.body,
      client_id_created_at: new Date(),
      client_status: "New",
    };
    run(
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
  }
);

routerApplication.post(
  `/${appPath}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (Array.isArray(req.body)) {
      const datum = [...req.body];
      const allAdds = datum.map((data) => {
        return applicationService.setData.apply(
          applicationService,
          [data].concat([appPath, req.params.id, PermissionScopes, data.id])
        );
      });
      run(res, () => Promise.all(allAdds));
    } else {
      const data = { ...req.body, whenCreated: new Date(), status: "New" };
      run(
        res,
        () =>
          applicationService.setData.apply(
            applicationService,
            [data].concat([appPath, req.params.id, PermissionScopes, data.id])
          ),
        undefined,
        undefined,
        data
      );
    }
  }
);

routerApplication.put(
  `/${appPath}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(
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
  }
);

routerApplication.put(
  `/${appPath}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(
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
  }
);

routerApplication.put(
  `/${appPath}/:id/${PermissionScopes}/:scopeId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
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

routerApplication.delete(
  `/${appPath}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = {};
    run(res, () =>
      applicationService.deleteData.apply(
        applicationService,
        [data].concat([appPath, req.params.id])
      )
    );
  }
);

routerApplication.delete(
  `/${appPath}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return applicationService.deleteData.apply(
        applicationService,
        [null].concat([appPath, item.id])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerApplication.delete(
  `/${appPath}/:id/${PermissionScopes}/:scopeId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
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
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return applicationService.deleteData.apply(
        applicationService,
        [null].concat([appPath, req.params.id, PermissionScopes, item.id])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

// common functions
function run(response, fn, success, error, data) {
  return fn()
    .then((result) =>
      response
        .status(200)
        .send(data ? data : success ? success(result) : result)
    )
    .catch((err) => {
      console.error(err);
      return response.status(500).send(error ? error(err) : err);
    });
}
