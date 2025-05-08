import express from "express";
//const { default: express } = await import("express");

import apiService from "../service/api-service.js";
import { getDocByPath, setDoc } from "../firebase/firebase-service.js";
import { GuardLeast } from "../../igwGuard.js";

const routerApi = express.Router();
export default routerApi;

const apiPath = "api";
const PermissionScopes = "PermissionScopes";
const AppRoles = "AppRoles";
const UsersAndGroups = "UsersAndGroups";

routerApi.get(
  `/${apiPath}/`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        apiService.getApisWhere(apiPath, null, null, req.query.condition)
      );
    } else {
      run(res, () => apiService.getData(apiPath));
    }
  }
);

routerApi.get(
  `/${apiPath}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () => apiService.getData(apiPath, req.params.id));
  }
);

routerApi.get(
  `/${apiPath}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () => apiService.getApiPermissionScopes(apiPath, req.params.id));
  }
);

routerApi.get(
  `/${apiPath}/:id/${AppRoles}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () => apiService.getApiAppRoles(apiPath, req.params.id));
  }
);

routerApi.get(
  `/${apiPath}/:id/${UsersAndGroups}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () => apiService.getApiUsersAndGroups(apiPath, req.params.id));
  }
);

routerApi.get(
  `/:companyId/api`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
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
  }
);

routerApi.get(
  `/:companyId/:domainId/api`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
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
  }
);

routerApi.post(
  `/${apiPath}/`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenCreated: new Date(), status: "New" };
    run(
      res,
      () =>
        apiService.setData.apply(apiService, [data].concat([apiPath, data.id])),
      undefined,
      undefined,
      data
    );
  }
);

routerApi.post(
  `/${apiPath}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenCreated: new Date(), status: "New" };
    run(
      res,
      () =>
        apiService.setData.apply(
          apiService,
          [data].concat([apiPath, req.params.id, PermissionScopes, data.id])
        ),
      undefined,
      undefined,
      data
    );
  }
);

routerApi.post(
  `/${apiPath}/:id/${AppRoles}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenCreated: new Date(), status: "New" };
    run(
      res,
      () =>
        apiService.setData.apply(
          apiService,
          [data].concat([apiPath, req.params.id, AppRoles, data.id])
        ),
      undefined,
      undefined,
      data
    );
  }
);

// routerApi.post(`/${apiPath}/:id/${UsersAndGroups}`, (req, res) => {
//   const data = { ...req.body, whenCreated: new Date(), status: "New" };
//   run(
//     res,
//     () =>
//       apiService.setData.apply(
//         apiService,
//         [data].concat([apiPath, req.params.id, UsersAndGroups, data.id])
//       ),
//     undefined,
//     undefined,
//     data
//   );
// });

routerApi.post(
  `/${apiPath}/:id/${UsersAndGroups}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    if (Array.isArray(req.body)) {
      const data = [...req.body];
      const allAdds = data.map((itemTemp) => {
        const objectRef = getDocByPath(itemTemp.ref);
        setDoc(`${itemTemp.ref}/AppRoles/${req.params.id}#${itemTemp.role}`, {
          id: `${req.params.id}#${itemTemp.role}`,
          api: req.params.id,
          role: itemTemp.role,
        });
        const item = { ...itemTemp, ref: objectRef, whenCreated: new Date() };
        return apiService.setData.apply(
          apiService,
          [{ ...item, whenCreated: new Date() }].concat([
            apiPath,
            req.params.id,
            UsersAndGroups,
            item.id,
          ])
        );
      });
      run(res, () => Promise.all(allAdds));
    } else {
      const objectRef = getDocByPath(req.body.ref);
      const data = { ...req.body, ref: objectRef, whenCreated: new Date() };
      run(
        res,
        () =>
          apiService.setData.apply(
            apiService,
            [data].concat([apiPath, req.params.id, UsersAndGroups, data.id])
          ),
        undefined,
        undefined,
        data
      );
    }
  }
);

routerApi.put(
  `/${apiPath}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData.apply(apiService, [data].concat([apiPath, data.id]))
    );
  }
);

routerApi.put(
  `/${apiPath}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData.apply(
        apiService,
        [data].concat([apiPath, req.params.id])
      )
    );
  }
);

routerApi.put(
  `/${apiPath}/:id/${PermissionScopes}/:scopeId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData.apply(
        apiService,
        [data].concat([
          apiPath,
          req.params.id,
          PermissionScopes,
          req.params.scopeId,
        ])
      )
    );
  }
);

routerApi.put(
  `/${apiPath}/:id/${AppRoles}/:roleId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData.apply(
        apiService,
        [data].concat([apiPath, req.params.id, AppRoles, req.params.roleId])
      )
    );
  }
);

routerApi.put(
  `/${apiPath}/:id/${UsersAndGroups}/:roleId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData.apply(
        apiService,
        [data].concat([
          apiPath,
          req.params.id,
          UsersAndGroups,
          req.params.roleId,
        ])
      )
    );
  }
);

routerApi.delete(
  `/${apiPath}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = {};
    run(res, () =>
      apiService.deleteData.apply(
        apiService,
        [data].concat([apiPath, req.params.id])
      )
    );
  }
);

routerApi.delete(
  `/${apiPath}/:id/${PermissionScopes}/:scopeId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () =>
      apiService.deleteData.apply(
        apiService,
        [null].concat([
          apiPath,
          req.params.id,
          PermissionScopes,
          req.params.scopeId,
        ])
      )
    );
  }
);

routerApi.delete(
  `/${apiPath}/:id/${AppRoles}/:roleId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () => {
      apiService.deleteData.apply(
        apiService,
        [null].concat([apiPath, req.params.id, AppRoles, req.params.roleId])
      );
    });
  }
);

routerApi.delete(
  `/${apiPath}/:id/${UsersAndGroups}/:usersGroupsId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () =>
      apiService.deleteData.apply(
        apiService,
        [null].concat([
          apiPath,
          req.params.id,
          UsersAndGroups,
          req.params.usersGroupsId,
        ])
      )
    );
  }
);

routerApi.delete(
  `/${apiPath}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return apiService.deleteData.apply(
        apiService,
        [null].concat([apiPath, req.params.id, PermissionScopes, item.id])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerApi.delete(
  `/${apiPath}/:id/${AppRoles}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return apiService.deleteData.apply(
        apiService,
        [null].concat([apiPath, req.params.id, AppRoles, item.id])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerApi.delete(
  `/${apiPath}/:id/${UsersAndGroups}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allRefDeletes = data.map((item) => {
      return apiService
        .getApiUsersAndGroupsRoleRef(apiPath, req.params.id, item.id)
        .get()
        .then((role) => {
          if (role.exists) {
            const roleData = role.data();
            getDocByPath(
              `${roleData.ref.path}/AppRoles/${req.params.id}#${roleData.role}`
            ).delete();
          } else {
            console.log("role no exists");
          }
        })
        .then(() => {
          apiService.deleteData.apply(
            apiService,
            [null].concat([apiPath, req.params.id, UsersAndGroups, item.id])
          );
        })
        .catch((error) => console.log(error));
    });
    run(res, () => Promise.all(allRefDeletes));
  }
);

// common functions
function run(response, fn, success, error, data) {
  return fn()
    .then((result) => {
      if (response.headersSent) return;
      response
        .status(200)
        .send(data ? data : success ? success(result) : result);
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).send(error ? error(err) : err);
    });
}
