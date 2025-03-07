import express from "express";
import apiService from "../service/api-service.js";

const routerApi = express.Router();
export default routerApi;

const apiPath = "api";

routerApi.get(`/${apiPath}/`, (req, res) => {
  if (req.query.condition) {
    run(res, () =>
      apiService.getApisWhere(apiPath, null, null, req.query.condition)
    );
  } else {
    run(res, () => apiService.getData(apiPath));
  }
});

routerApi.get(`/${apiPath}/:id`, (req, res) => {
  run(res, () => apiService.getData(apiPath, req.params.id));
});

routerApi.get(`/${apiPath}/:id/PermissionScopes`, (req, res) => {
  run(res, () => apiService.getApiPermissionScopes(apiPath, req.params.id));
});

routerApi.get(`/:companyId/api`, (req, res) => {
  run(res, () => apiService.getApis(apiPath, req.params.companyId));
  if (req.query.condition) {
    run(res, () =>
      apiService.getApisWhere(
        apiPath,
        req.params.companyId,
        null,
        req.query.condition
      )
    );
  } else {
    run(res, () => apiService.getApis(apiPath, req.params.companyId));
  }
});

routerApi.get(`/:companyId/:domainId/api`, (req, res) => {
  if (req.query.condition) {
    run(res, () =>
      apiService.getApisWhere(
        apiPath,
        req.params.companyId,
        req.params.domainId,
        req.query.condition
      )
    );
  } else {
    run(res, () =>
      apiService.getApis(apiPath, req.params.companyId, req.params.domainId)
    );
  }
});

routerApi.post(`/${apiPath}/`, (req, res) => {
  const data = { ...req.body, whenCreated: new Date(), status: "New" };
  run(
    res,
    () =>
      apiService.setData.apply(apiService, [data].concat([apiPath, data.id])),
    undefined,
    undefined,
    data
  );
});

routerApi.post(`/${apiPath}/:id/PermissionScopes`, (req, res) => {
  const data = { ...req.body, whenCreated: new Date(), status: "New" };
  run(
    res,
    () =>
      apiService.setData.apply(
        apiService,
        [data].concat([apiPath, req.params.id, "PermissionScopes", data.id])
      ),
    undefined,
    undefined,
    data
  );
});

routerApi.put(`/${apiPath}`, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    apiService.updateData.apply(apiService, [data].concat([apiPath, data.id]))
  );
});

routerApi.put(`/${apiPath}/:id`, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    apiService.updateData.apply(
      apiService,
      [data].concat([apiPath, req.params.id])
    )
  );
});

routerApi.put(`/${apiPath}/:id/PermissionScopes/:scopeId`, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    apiService.updateData.apply(
      apiService,
      [data].concat([apiPath, req.params.id, req.params.scopeId])
    )
  );
});

routerApi.delete(`/${apiPath}/:id`, (req, res) => {
  const data = {};
  run(res, () =>
    apiService.deleteData.apply(
      apiService,
      [data].concat([apiPath, req.params.id])
    )
  );
});

routerApi.delete(`/${apiPath}/:id/PermissionScopes/:scopeId`, (req, res) => {
  run(res, () =>
    apiService.deleteData.apply(
      apiService,
      [null].concat([
        apiPath,
        req.params.id,
        "PermissionScopes",
        req.params.scopeId,
      ])
    )
  );
});

routerApi.delete(`/${apiPath}`, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return apiService.deleteData.apply(
      apiService,
      [null].concat([apiPath, item.id])
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
