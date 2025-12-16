import express from "express";
//const { default: express } = await import("express");
import domainService from "../service/domain-service.js";
import { DOMAIN_COLL, generateId } from "../service/remote-path-service.js";
import { GuardLeast } from "../../igwGuard.js";
import { createPostHandler } from "../helper/httpHandler.js";

const routerDomain = express.Router();
export default routerDomain;

routerDomain.get(
  `/:id/${DOMAIN_COLL}/primary`,
  GuardLeast.check([["company:admin"]], [["tenant:admin"], ["Ops:Admin"]]),
  (req, res) => {
    run(res, () => domainService.getPrimaryDomain(req.params.id));
  }
);

routerDomain.get(
  `/:id/${DOMAIN_COLL}/:domainId`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      domainService.getDomainInfo(req.params.id, req.params.domainId)
    );
  }
);

routerDomain.get(
  `/:id/${DOMAIN_COLL}`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () => domainService.getData(req.params.id));
  }
);

routerDomain.get(
  `/:id/${DOMAIN_COLL}/:domainId/Connections`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      domainService.getDomainConnections(req.params.id, req.params.domainId)
    );
  }
);

routerDomain.get(
  `/:id/${DOMAIN_COLL}/:domainId/Connections/:connectionId`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      domainService.getDomainConnections(
        req.params.id,
        req.params.domainId,
        req.params.connectionId
      )
    );
  }
);

routerDomain.post(
  `/:id/${DOMAIN_COLL}`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  async (req, res) => {
    const data = {
      ...req.body,
      id: req.body.name,
      whenCreated: new Date(),
      status: "New",
    };
    const domain = await domainService.getDomainByName(
      req.params.id,
      data.name
    );
    if (domain.length > 0) {
      return res.status(409).send("Item exists");
    }
    run(
      res,
      () =>
        domainService.setData.apply(
          domainService,
          [data].concat([req.params.id, data.id])
        ),
      undefined,
      undefined,
      data
    );
  }
);

routerDomain.post(
  `/:id/${DOMAIN_COLL}/:domainId/Connections`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  createPostHandler(
    domainService,
    (req) => [req.params.id, req.params.domainId, "Connections"],
    {
      generateIdFn: (item) => generateId(item.name),
    }
  )
);

routerDomain.put(
  `/:id/${DOMAIN_COLL}/:domainId`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      domainService.updateData.apply(
        domainService,
        [data].concat([req.params.id, req.params.domainId])
      )
    );
  }
);

routerDomain.put(
  `/:id/${DOMAIN_COLL}`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = req.body;
    const allDomains = data.map((item) => {
      return domainService.updateData.apply(
        domainService,
        [{ ...item, whenUpdated: new Date(), status: "Updated" }].concat([
          req.params.id,
          item.id,
        ])
      );
    });

    run(res, () => Promise.all(allDomains));
  }
);

routerDomain.put(
  `/:id/${DOMAIN_COLL}/:domainId/Connections/:connectionId`,
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      domainService.updateData.apply(
        domainService,
        [data].concat([
          req.params.id,
          req.params.domainId,
          "Connections",
          req.params.connectionId,
        ])
      )
    );
  }
);

routerDomain.delete(
  `/:id/${DOMAIN_COLL}/:domainId`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = {};
    run(res, () =>
      domainService.deleteData.apply(
        domainService,
        [data].concat([req.params.id, req.params.domainId])
      )
    );
  }
);

routerDomain.delete(
  `/:id/${DOMAIN_COLL}`,
  GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return domainService.deleteData.apply(
        domainService,
        [null].concat([req.params.id, item.id])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerDomain.delete(
  `/:id/${DOMAIN_COLL}/:domainId/Connections/:accountId`,
  (req, res) => {
    run(res, () =>
      domainService.deleteData.apply(
        domainService,
        [null].concat([
          req.params.id,
          req.params.domainId,
          "Connections",
          req.params.accountId,
        ])
      )
    );
  }
);

routerDomain.delete(`/:id/${DOMAIN_COLL}/:domainId/Connections`, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return domainService.deleteData.apply(
      domainService,
      [null].concat([
        req.params.id,
        req.params.domainId,
        "Connections",
        item.id,
      ])
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
