import express from "express";
//const { default: express } = await import("express");
import scimService from "../service/scim-service.js";
import {
  DOMAIN_COLL,
  SCIM_COLL,
  generateId,
} from "../service/remote-path-service.js";

const routerScim = express.Router();

export default routerScim;

routerScim.get(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        scimService.getScimsWhere(
          req.params.id,
          req.params.domainId,
          req.query.condition
        )
      );
    } else {
      run(res, () => scimService.getData(req.params.id, req.params.domainId));
    }
  }
);

routerScim.get(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}/:scimId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      scimService.getData(
        req.params.id,
        req.params.domainId,
        req.params.scimId
      )
    );
  }
);

routerScim.post(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  ////GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  async (req, res) => {
    const id = generateId(
      req.body.name ?? req.body.displayName.replace(/\s+/g, "")
    );

    const data = {
      ...req.body,
      id,
      whenCreated: new Date(),
      status: "New",
    };

    const scim = await scimService.getData(
      req.params.id,
      req.params.domainId,
      data.id
    );
    if (scim.name) {
      console.log("scim exist", scim);
      return res.status(409).send("Item exists");
    }

    run(
      res,
      () =>
        scimService.setData.apply(
          scimService,
          [data].concat([req.params.id, req.params.domainId, data.id])
        ),
      undefined,
      undefined,
      data
    );
  }
);

routerScim.put(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}/:scimId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date() };
    run(res, () =>
      scimService.updateData.apply(
        scimService,
        [data].concat([req.params.id, req.params.domainId, req.params.scimId])
      )
    );
  }
);

routerScim.put(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allUpdates = data.map((item) => {
      return scimService.updateData.apply(
        scimService,
        [{ ...item, whenUpdated: new Date() }].concat([
          req.params.id,
          req.params.domainId,
          item.id,
        ])
      );
    });
    run(res, () => Promise.all(allUpdates));
  }
);

routerScim.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return scimService.deleteData.apply(
        scimService,
        [null].concat([req.params.id, req.params.domainId, item.id])
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
