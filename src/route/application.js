import express from "express";
import applicationService from "../service/application-service.js";

const routerApplication = express.Router();
export default routerApplication;

const appPath = "application";

routerApplication.get(`/${appPath}/`, (req, res) => {
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
});

routerApplication.get(`/${appPath}/:id`, (req, res) => {
  run(res, () => applicationService.getData(appPath, req.params.id));
});

routerApplication.get(`/:companyId/application`, (req, res) => {
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
});

routerApplication.get(`/:companyId/:domainId/application`, (req, res) => {
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
});

routerApplication.post(`/${appPath}/`, (req, res) => {
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
});

routerApplication.put(`/${appPath}`, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    applicationService.updateData.apply(
      applicationService,
      [data].concat([appPath, data.id])
    )
  );
});

routerApplication.put(`/${appPath}/:id`, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    applicationService.updateData.apply(
      applicationService,
      [data].concat([appPath, req.params.id])
    )
  );
});

routerApplication.delete(`/${appPath}/:id`, (req, res) => {
  const data = {};
  run(res, () =>
    applicationService.deleteData.apply(
      applicationService,
      [data].concat([appPath, req.params.id])
    )
  );
});

routerApplication.delete(`/${appPath}`, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return applicationService.deleteData.apply(
      applicationService,
      [null].concat([appPath, item.id])
    );
  });
  run(res, () => Promise.all(allDeletes));
});

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
