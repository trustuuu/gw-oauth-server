import express from "express";
//const { default: express } = await import("express");
import companyService from "../service/company-service.js";
import { generateId } from "../service/remote-path-service.js";

const routerCompany = express.Router();
export default routerCompany;

routerCompany.get(`/`, (req, res) => {
  run(res, () => companyService.getData(req.params.id));
});

routerCompany.get(`/:id`, (req, res) => {
  run(res, () => companyService.getData(req.params.id));
});

routerCompany.get(`/:id/childCompanys`, (req, res) => {
  run(res, () => companyService.getChildCompanys(req.params.id));
});

routerCompany.post("/", async (req, res) => {
  const data = {
    ...req.body,
    id: generateId(req.body.name),
    whenCreated: new Date(),
    status: "New",
  };

  const company = await companyService.getData(data.id);
  if (company.name) {
    console.log("company exist", company);
    return res.status(409).send("Item exists");
  }

  run(
    res,
    () =>
      companyService.setData.apply(companyService, [data].concat([data.id])),
    undefined,
    undefined,
    data
  );
});

routerCompany.put("/:id", (req, res) => {
  const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
  run(res, () =>
    companyService.updateData.apply(
      companyService,
      [data].concat([req.params.id])
    )
  );
});

routerCompany.delete(`/:id`, (req, res) => {
  const data = {};
  //run(res, () => companyService.deleteData(req.params.id));
  run(res, () =>
    companyService.deleteData.apply(
      companyService,
      [data].concat([req.params.id])
    )
  );
});

routerCompany.delete(`/`, (req, res) => {
  const data = [...req.body];
  const allDeletes = data.map((item) => {
    return companyService.deleteData.apply(companyService, [item]);
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
