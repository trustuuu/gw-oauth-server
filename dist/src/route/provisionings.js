import express from "express";
//const { default: express } = await import("express");
import provisioningService from "../service/provisioning-service.js";
import { PROVISIONING_COLL, generateId, } from "../service/remote-path-service.js";
import { GuardLeast } from "../../igwGuard.js";
const routerProvisioning = express.Router();
export default routerProvisioning;
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
routerProvisioning.get(`/:id/${PROVISIONING_COLL}/:provisioningId`, GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]), (req, res) => {
    run(res, () => provisioningService.getData(req.params.id, req.params.provisioningId));
});
routerProvisioning.get(`/:id/${PROVISIONING_COLL}`, GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]), (req, res) => {
    run(res, () => provisioningService.getData(req.params.id));
});
routerProvisioning.post(`/:id/${PROVISIONING_COLL}`, GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]), async (req, res) => {
    const data = {
        ...req.body,
        id: generateId(req.body.name),
        whenCreated: new Date(),
        status: "New",
    };
    const provisioning = await provisioningService.getData(req.params.id, data.id);
    if (provisioning.name) {
        console.log("provisioning exist", provisioning);
        return res.status(409).send("Item exists");
    }
    run(res, () => provisioningService.setData(data, req.params.id, data.id), undefined, undefined, data);
});
routerProvisioning.put(`/:id/${PROVISIONING_COLL}/:provisioningId`, GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]), (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () => provisioningService.updateData(data, req.params.id, req.params.provisioningId));
});
routerProvisioning.delete(`/:id/${PROVISIONING_COLL}/:provisioningId`, GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]), (req, res) => {
    const data = {};
    run(res, () => provisioningService.deleteData(data, req.params.id, req.params.provisioningId));
});
