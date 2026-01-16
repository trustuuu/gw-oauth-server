import express from "express";
import companyService from "../service/company-service.js";
import { GuardLeast } from "../../igwGuard.js";
const routerCompany = express.Router();
export default routerCompany;
// common functions
function run(response, fn, success, error, data) {
    return fn()
        .then((result) => response
        .status(200)
        .send(data ? data : success ? success(result) : result))
        .catch((err) => {
        console.error(err);
        return response.status(500).send(error ? error(err) : err);
    });
}
routerCompany.get(`/`, GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), (req, res) => {
    run(res, () => companyService.getData(req.params.id));
});
routerCompany.get(`/:id`, GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), (req, res) => {
    run(res, () => companyService.getData(req.params.id));
});
routerCompany.get(`/:id/childCompanys`, GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), (req, res) => {
    run(res, () => companyService.getChildCompanys(req.params.id));
});
routerCompany.post("/", GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), async (req, res) => {
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
    run(res, () => companyService.setData(data, data.id), undefined, undefined, data);
});
routerCompany.put("/:id", GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () => companyService.updateData(data, req.params.id));
});
routerCompany.delete(`/:id`, GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), (req, res) => {
    const data = {};
    //run(res, () => companyService.deleteData(req.params.id));
    run(res, () => companyService.deleteData(data, req.params.id));
});
routerCompany.delete(`/`, GuardLeast.check([["company:admin"]], [["tenant:admin"], ["company:admin"], ["Ops:Admin"]]), (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
        console.log("delete item", item);
        return companyService.deleteData(item);
    });
    run(res, () => Promise.all(allDeletes));
});
