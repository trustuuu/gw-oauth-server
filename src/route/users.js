import express from "express";
//const { default: express } = await import("express");
import userService from "../service/user-service.js";
import {
  DOMAIN_COLL,
  USER_COLL,
  generateId,
} from "../service/remote-path-service.js";
import md5 from "blueimp-md5";

const routerUser = express.Router();
export default routerUser;

routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, (req, res) => {
  if (req.query.condition) {
    run(res, () =>
      userService.getUsersWhere(
        req.params.id,
        req.params.domainId,
        req.query.condition
      )
    );
  } else {
    run(res, () => userService.getData(req.params.id, req.params.domainId));
  }
});

routerUser.get(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId`,
  (req, res) => {
    run(res, () =>
      userService.getData(req.params.id, req.params.domainId, req.params.userId)
    );
  }
);

routerUser.get(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes`,
  (req, res) => {
    run(res, () =>
      userService.getUserPermissionScopes(
        req.params.id,
        req.params.domainId,
        req.params.userId
      )
    );
  }
);

routerUser.post(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`,
  async (req, res) => {
    const data = {
      ...req.body,
      id: generateId(req.body.username),
      authVerification: md5(req.body.authVerification),
      whenCreated: new Date(),
      status: "new",
    };

    const user = await userService.getUserByEmail(
      req.params.id,
      req.params.domainId,
      data.email
    );
    if (user.length > 0) {
      console.log("user exist", user);
      return res.status(409).send("Item exists");
    }

    let postFn = null;
    if ("root" in data) {
      postFn = () =>
        userService.createAuthUser(req.params.id, req.params.domainId, data.id);
    }

    run(
      res,
      () =>
        userService.setData.apply(
          userService,
          [data].concat([req.params.id, req.params.domainId, data.id])
        ),
      undefined,
      undefined,
      data,
      postFn
    );
  }
);

routerUser.post(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes`,
  async (req, res) => {
    if (Array.isArray(req.body)) {
      const data = [...req.body];
      const allAdds = data.map((data) => {
        return userService.setData.apply(
          userService,
          [data].concat([
            req.params.id,
            req.params.domainId,
            req.params.userId,
            "PermissionScopes",
            data.id,
          ])
        );
      });
      run(res, () => Promise.all(allAdds));
    } else {
      const data = req.body;
      run(
        res,
        () =>
          userService.setData.apply(
            userService,
            [data].concat([
              req.params.id,
              req.params.domainId,
              req.params.userId,
              "PermissionScopes",
              data.id,
            ])
          ),
        undefined,
        undefined,
        data
      );
    }
  }
);

routerUser.put(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId`,
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date() };
    run(res, () =>
      userService.updateData.apply(
        userService,
        [data].concat([req.params.id, req.params.domainId, req.params.userId])
      )
    );
  }
);

routerUser.put(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, (req, res) => {
  const data = [...req.body];
  const allUpdates = data.map((item) => {
    return userService.updateData.apply(
      userService,
      [{ ...item, whenUpdated: new Date() }].concat([
        req.params.id,
        req.params.domainId,
        item.id,
      ])
    );
  });
  run(res, () => Promise.all(allUpdates));
});

routerUser.put(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes/:scopeId`,
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      userService.updateData.apply(
        userService,
        [data].concat([
          req.params.id,
          req.params.domainId,
          req.params.userId,
          req.params.scopeId,
        ])
      )
    );
  }
);

routerUser.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId`,
  (req, res) => {
    run(res, () =>
      userService.deleteData.apply(
        userService,
        [{}].concat([req.params.id, req.params.domainId, req.params.userId])
      )
    );
  }
);

routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return userService.deleteData.apply(
      userService,
      [null].concat([req.params.id, req.params.domainId, item.id])
    );
  });
  run(res, () => Promise.all(allDeletes));
});

routerUser.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes/:scopeId`,
  (req, res) => {
    run(res, () =>
      userService.deleteData.apply(
        userService,
        [null].concat([
          req.params.id,
          req.params.domainId,
          req.params.userId,
          "PermissionScopes",
          req.params.scopeId,
        ])
      )
    );
  }
);

routerUser.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes`,
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return userService.deleteData.apply(
        userService,
        [null].concat([
          req.params.id,
          req.params.domainId,
          req.params.userId,
          "PermissionScopes",
          item.id,
        ])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

// common functions
function run(response, fn, success, error, data, postFn) {
  return fn()
    .then((result) => {
      if (postFn) {
        postFn();
      }
      response
        .status(200)
        .send(data ? data : success ? success(result) : result);
    })
    .catch((err) => {
      console.error(err);
      return response.status(500).send(error ? error(err) : err);
    });
}
