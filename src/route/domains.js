import express from "express";
//const { default: express } = await import("express");
import domainService from "../service/domain-service.js";
import { DOMAIN_COLL, generateId } from "../service/remote-path-service.js";

const routerDomain = express.Router();
export default routerDomain;

routerDomain.get(`/:id/${DOMAIN_COLL}/primary`, (req, res) => {
  run(res, () => domainService.getPrimaryDomain(req.params.id));
});

routerDomain.get(`/:id/${DOMAIN_COLL}/:domainId`, (req, res) => {
  run(res, () =>
    domainService.getDomainInfo(req.params.id, req.params.domainId)
  );
});

routerDomain.get(`/:id/${DOMAIN_COLL}`, (req, res) => {
  run(res, () => domainService.getData(req.params.id));
});

routerDomain.post(`/:id/${DOMAIN_COLL}`, async (req, res) => {
  const data = {
    ...req.body,
    id: generateId(req.body.name),
    whenCreated: new Date(),
    status: "New",
  };
  const domain = await domainService.getDomainInfo(req.params.id, data.id);
  if (domain.name) {
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
});

routerDomain.put(`/:id/${DOMAIN_COLL}/:domainId`, (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    domainService.updateData.apply(
      domainService,
      [data].concat([req.params.id, req.params.domainId])
    )
  );
});

routerDomain.put(`/:id/${DOMAIN_COLL}`, (req, res) => {
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
});

routerDomain.delete(`/:id/${DOMAIN_COLL}/:domainId`, (req, res) => {
  const data = {};
  run(res, () =>
    domainService.deleteData.apply(
      domainService,
      [data].concat([req.params.id, req.params.domainId])
    )
  );
});

routerDomain.delete(`/:id/${DOMAIN_COLL}`, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return domainService.deleteData.apply(
      domainService,
      [null].concat([req.params.id, item.id])
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
