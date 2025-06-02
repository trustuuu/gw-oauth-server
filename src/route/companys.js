import express from "express";
import companyService from "../service/company-service.js";
import { GuardLeast } from "../../igwGuard.js";
const routerCompany = express.Router();
export default routerCompany;

// routerCompany.get(`/`,  Guard.check(["profile:view"]), Guard.roles(["Admin", "SuperUser"]), (req, res) => {
//   run(res, () => companyService.getData(req.params.id));
// });

//OR
// routerCompany.get(`/`,  Guard.check(["profile:view"],["profile:admin"]), (req, res) => {
//   run(res, () => companyService.getData(req.params.id));
// });

//And
// routerCompany.get(`/`,  Guard.check(["profile:view", "profile:admin"]), (req, res) => {
//   run(res, () => companyService.getData(req.params.id));
// });

routerCompany.get(
  `/`,
  GuardLeast.check(undefined, [
    ["tenant:admin"],
    ["company:admin"],
    ["Ops:Admin"],
  ]),
  (req, res) => {
    run(res, () => companyService.getData(req.params.id));
  }
);

routerCompany.get(
  `/:id`,
  GuardLeast.check(undefined, [
    ["tenant:admin"],
    ["company:admin"],
    ["Ops:Admin"],
  ]),
  (req, res) => {
    run(res, () => companyService.getData(req.params.id));
  }
);

routerCompany.get(
  `/:id/childCompanys`,
  GuardLeast.check(undefined, [
    ["tenant:admin"],
    ["company:admin"],
    ["Ops:Admin"],
  ]),
  (req, res) => {
    run(res, () => companyService.getChildCompanys(req.params.id));
  }
);

routerCompany.post(
  "/",
  //GuardLeast.check(["company:write"], [["tenant:admin"], ["company:admin"]]),
  async (req, res) => {
    const data = {
      ...req.body,
      id: `${req.body.name}-${crypto.randomUUID()}`,
      whenCreated: new Date(),
      status: "New",
    };

    const company = await companyService.getCompanyByName(data.name);
    if (company.length > 0) {
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
  }
);

routerCompany.put(
  "/:id",
  GuardLeast.check(undefined, [["tenant:admin"], ["company:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      companyService.updateData.apply(
        companyService,
        [data].concat([req.params.id])
      )
    );
  }
);

routerCompany.delete(
  `/:id`,
  GuardLeast.check(undefined, [["tenant:admin"], ["company:admin"]]),
  (req, res) => {
    const data = {};
    //run(res, () => companyService.deleteData(req.params.id));
    run(res, () =>
      companyService.deleteData.apply(
        companyService,
        [data].concat([req.params.id])
      )
    );
  }
);

routerCompany.delete(
  `/`,
  GuardLeast.check(undefined, [["tenant:admin"], ["company:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return companyService.deleteData.apply(companyService, [item]);
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
