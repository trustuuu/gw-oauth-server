import express from "express";
import provisioningService from "../service/provisioning-service.js";
import {
  PROVISIONING_COLL,
  generateId,
} from "../service/remote-path-service.js";

const routerProvisioning = express.Router();
export default routerProvisioning;

routerProvisioning.get(
  `/:id/${PROVISIONING_COLL}/:provisioningId`,
  (req, res) => {
    run(res, () =>
      provisioningService.getData(req.params.id, req.params.provisioningId)
    );
  }
);

routerProvisioning.get(`/:id/${PROVISIONING_COLL}`, (req, res) => {
  run(res, () => provisioningService.getData(req.params.id));
});

routerProvisioning.post(`/:id/${PROVISIONING_COLL}`, async (req, res) => {
  const data = {
    ...req.body,
    id: generateId(req.body.name),
    whenCreated: new Date(),
    status: "New",
  };

  const provisioning = await provisioningService.getData(
    req.params.id,
    data.id
  );
  if (provisioning.name) {
    console.log("provisioning exist", provisioning);
    return res.status(409).send("Item exists");
  }

  run(
    res,
    () =>
      provisioningService.setData.apply(
        provisioningService,
        [data].concat([req.params.id, data.id])
      ),
    undefined,
    undefined,
    data
  );
});

routerProvisioning.put(
  `/:id/${PROVISIONING_COLL}/:provisioningId`,
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () =>
      provisioningService.updateData.apply(
        provisioningService,
        [data].concat([req.params.id, req.params.provisioningId])
      )
    );
  }
);

routerProvisioning.delete(
  `/:id/${PROVISIONING_COLL}/:provisioningId`,
  (req, res) => {
    const data = {};
    run(res, () =>
      provisioningService.deleteData.apply(
        provisioningService,
        [data].concat([req.params.id, req.params.provisioningId])
      )
    );
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
