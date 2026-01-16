import express from "express";
//const { default: express } = await import("express");

import apiService from "../service/api-service.js";
import { getDocByPath, setDoc } from "../firebase/firebase-service.js";
import { GuardLeast } from "../../igwGuard.js";
import { API_PATH } from "../service/remote-path-service.js";

const routerApi = express.Router();
export default routerApi;

const PermissionScopes = "PermissionScopes";
const AppRoles = "AppRoles";
const UsersAndGroups = "UsersAndGroups";

// Helper function to handle response
function run(response: any, fn: any, success?: any, error?: any, data?: any) {
  return fn()
    .then((result: any) => {
      if (response.headersSent) return;
      response
        .status(200)
        .send(data ? data : success ? success(result) : result);
    })
    .catch((err: any) => {
      console.error(err);
      return response.status(500).send(error ? error(err) : err);
    });
}

routerApi.get(
  `/${API_PATH}/`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        apiService.getApisWhere(
          API_PATH,
          null as any,
          null as any,
          req.query.condition
        )
      );
    } else {
      run(res, () => apiService.getData(API_PATH));
    }
  }
);

routerApi.get(
  `/${API_PATH}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => apiService.getData(API_PATH, req.params.id));
  }
);

routerApi.get(
  `/${API_PATH}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => apiService.getApiPermissionScopes(API_PATH, req.params.id));
  }
);

routerApi.get(
  `/${API_PATH}/:id/${AppRoles}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => apiService.getApiAppRoles(API_PATH, req.params.id));
  }
);

routerApi.get(
  `/${API_PATH}/:id/${UsersAndGroups}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => apiService.getApiUsersAndGroups(API_PATH, req.params.id));
  }
);

routerApi.get(
  `/:companyId/api`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => apiService.getApis(API_PATH, req.params.companyId));
    if (req.query.condition) {
      run(res, () =>
        apiService.getApisWhere(
          API_PATH,
          req.params.companyId,
          null as any,
          req.query.condition
        )
      );
    } else {
      run(res, () => apiService.getApis(API_PATH, req.params.companyId));
    }
  }
);

routerApi.get(
  `/:companyId/:domainId/api`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        apiService.getApisWhere(
          API_PATH,
          req.params.companyId,
          req.params.domainId,
          req.query.condition
        )
      );
    } else {
      run(res, () =>
        apiService.getApis(API_PATH, req.params.companyId, req.params.domainId)
      );
    }
  }
);

routerApi.post(
  `/${API_PATH}/`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenCreated: new Date(), status: "New" };
    run(
      res,
      () => apiService.setData(data, API_PATH, data.id),
      undefined,
      undefined,
      data
    );
  }
);

routerApi.post(
  `/${API_PATH}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenCreated: new Date(), status: "New" };
    run(
      res,
      () =>
        apiService.setData(
          data,
          API_PATH,
          req.params.id,
          PermissionScopes,
          data.id
        ),
      undefined,
      undefined,
      data
    );
  }
);

routerApi.post(
  `/${API_PATH}/:id/${AppRoles}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenCreated: new Date(), status: "New" };
    run(
      res,
      () =>
        apiService.setData(data, API_PATH, req.params.id, AppRoles, data.id),
      undefined,
      undefined,
      data
    );
  }
);

// routerApi.post(`/${API_PATH}/:id/${UsersAndGroups}`, (req, res) => {
//   const data = { ...req.body, whenCreated: new Date(), status: "New" };
//   run(
//     res,
//     () =>
//       apiService.setData.apply(
//         apiService,
//         [data].concat([API_PATH, req.params.id, UsersAndGroups, data.id])
//       ),
//     undefined,
//     undefined,
//     data
//   );
// });

routerApi.post(
  `/${API_PATH}/:id/${UsersAndGroups}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (Array.isArray(req.body)) {
      const data = [...req.body];
      const allAdds = data.map((itemTemp: any) => {
        const objectRef = getDocByPath(itemTemp.ref);
        setDoc(`${itemTemp.ref}/AppRoles/${req.params.id}#${itemTemp.role}`, {
          id: `${req.params.id}#${itemTemp.role}`,
          api: req.params.id,
          role: itemTemp.role,
        });
        const item = { ...itemTemp, ref: objectRef, whenCreated: new Date() };
        return apiService.setData(
          { ...item, whenCreated: new Date() },
          API_PATH,
          req.params.id,
          UsersAndGroups,
          item.id
        );
      });
      run(res, () => Promise.all(allAdds));
    } else {
      const objectRef = getDocByPath(req.body.ref);
      const data = { ...req.body, ref: objectRef, whenCreated: new Date() };
      run(
        res,
        () =>
          apiService.setData(
            data,
            API_PATH,
            req.params.id,
            UsersAndGroups,
            data.id
          ),
        undefined,
        undefined,
        data
      );
    }
  }
);

routerApi.put(
  `/${API_PATH}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () => apiService.updateData(data, API_PATH, data.id));
  }
);

routerApi.put(
  `/${API_PATH}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () => apiService.updateData(data, API_PATH, req.params.id));
  }
);

routerApi.put(
  `/${API_PATH}/:id/${PermissionScopes}/:scopeId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData(
        data,
        API_PATH,
        req.params.id,
        PermissionScopes,
        req.params.scopeId
      )
    );
  }
);

routerApi.put(
  `/${API_PATH}/:id/${AppRoles}/:roleId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData(
        data,
        API_PATH,
        req.params.id,
        AppRoles,
        req.params.roleId
      )
    );
  }
);

routerApi.put(
  `/${API_PATH}/:id/${UsersAndGroups}/:roleId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      apiService.updateData(
        data,
        API_PATH,
        req.params.id,
        UsersAndGroups,
        req.params.roleId
      )
    );
  }
);

routerApi.delete(
  `/${API_PATH}/:id`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = {};
    run(res, () => apiService.deleteData(data, API_PATH, req.params.id));
  }
);

routerApi.delete(
  `/${API_PATH}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item: any) => {
      return apiService.deleteData(null as any, API_PATH, item.id);
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerApi.delete(
  `/${API_PATH}/:id/${PermissionScopes}/:scopeId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      apiService.deleteData(
        null as any,
        API_PATH,
        req.params.id,
        PermissionScopes,
        req.params.scopeId
      )
    );
  }
);

routerApi.delete(
  `/${API_PATH}/:id/${AppRoles}/:roleId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => {
      apiService.deleteData(
        null as any,
        API_PATH,
        req.params.id,
        AppRoles,
        req.params.roleId
      );
    });
  }
);

routerApi.delete(
  `/${API_PATH}/:id/${UsersAndGroups}/:usersGroupsId`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      apiService.deleteData(
        null as any,
        API_PATH,
        req.params.id,
        UsersAndGroups,
        req.params.usersGroupsId
      )
    );
  }
);

routerApi.delete(
  `/${API_PATH}/:id/${PermissionScopes}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item: any) => {
      return apiService.deleteData(
        null as any,
        API_PATH,
        req.params.id,
        PermissionScopes,
        item.id
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerApi.delete(
  `/${API_PATH}/:id/${AppRoles}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item: any) => {
      return apiService.deleteData(
        null as any,
        API_PATH,
        req.params.id,
        AppRoles,
        item.id
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerApi.delete(
  `/${API_PATH}/:id/${UsersAndGroups}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allRefDeletes = data.map((item: any) => {
      return apiService
        .getApiUsersAndGroupsRoleRef(API_PATH, req.params.id, item.id)
        .get()
        .then((role: any) => {
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
          apiService.deleteData(
            null as any,
            API_PATH,
            req.params.id,
            UsersAndGroups,
            item.id
          );
        })
        .catch((error: any) => console.log(error));
    });
    run(res, () => Promise.all(allRefDeletes));
  }
);
