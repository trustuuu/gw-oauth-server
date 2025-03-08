import express from "express";
//const { default: express } = await import("express");
import userService from "../service/user-service.js";
import {
  DOMAIN_COLL,
  USER_COLL,
  generateId,
} from "../service/remote-path-service.js";

const routerUser = express.Router();
export default routerUser;

routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, (req, res) => {
  console.log("req.query", req.query);
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

routerUser.post(
  `/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`,
  async (req, res) => {
    const data = {
      ...req.body,
      id: generateId(req.body.username),
      whenCreated: new Date(),
      status: "new",
    };

    const user = await userService.getData(
      req.params.id,
      req.params.domainId,
      data.id
    );
    if (user.name) {
      console.log("user exist", user);
      return res.status(409).send("Item exists");
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
      data
    );
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
