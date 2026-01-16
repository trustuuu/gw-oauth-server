import express from "express";
//const { default: express } = await import("express");
import scimService from "../service/scim-service.js";
import {
  DOMAIN_COLL,
  SCIM_COLL,
  generateId,
} from "../service/remote-path-service.js";
import { GuardLeast } from "../../igwGuard.js";

const routerScim = express.Router();

export default routerScim;

// common functions
function run(response: any, fn: any, success?: any, error?: any, data?: any) {
  return fn()
    .then((result: any) =>
      response
        .status(200)
        .send(data ? data : success ? success(result) : result)
    )
    .catch((err: any) => {
      console.error(err);
      return response.status(500).send(error ? error(err) : err);
    });
}

routerScim.get(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  GuardLeast.check([["scim:read"]], [["Ops:Admin"], ["tenant:admin"]]),
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
  GuardLeast.check(["scim:read"], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      scimService.getData(req.params.id, req.params.domainId, req.params.scimId)
    );
  }
);

routerScim.post(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
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

    const scim: any = await scimService.getData(
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
        scimService.setData(data, req.params.id, req.params.domainId, data.id),
      undefined,
      undefined,
      data
    );
  }
);

routerScim.put(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}/:scimId`,
  GuardLeast.check([["scim:read"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date() };
    run(res, () =>
      scimService.updateData(
        data,
        req.params.id,
        req.params.domainId,
        req.params.scimId
      )
    );
  }
);

routerScim.put(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  GuardLeast.check([["scim:read"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allUpdates = data.map((item: any) => {
      return scimService.updateData(
        { ...item, whenUpdated: new Date() },
        req.params.id,
        req.params.domainId,
        item.id
      );
    });
    run(res, () => Promise.all(allUpdates));
  }
);

routerScim.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${SCIM_COLL}`,
  GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    console.log(req.body);
    const data = [...req.body];
    const allDeletes = data.map((item: any) => {
      return scimService.deleteData(
        null as any,
        req.params.id,
        req.params.domainId,
        item
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);
