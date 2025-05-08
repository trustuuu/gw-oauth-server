import express from "express";
//const { default: express } = await import("express");
import connectionService from "../service/connection-service.js";
import {
  CONNECTION_COLL,
  PROVISIONING_COLL,
  generateId,
} from "../service/remote-path-service.js";
import { GuardLeast } from "../../igwGuard.js";

const routerConnection = express.Router();
export default routerConnection;

routerConnection.get(
  `/:id/${PROVISIONING_COLL}/:provisioningId/${CONNECTION_COLL}/:connectionId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () =>
      connectionService.getData(
        req.params.id,
        req.params.provisioningId,
        req.params.connectionId
      )
    );
  }
);

routerConnection.get(
  `/:id/${PROVISIONING_COLL}/:provisioningId/${CONNECTION_COLL}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    run(res, () =>
      connectionService.getData(req.params.id, req.params.provisioningId)
    );
  }
);

routerConnection.post(
  `/:id/${PROVISIONING_COLL}/:provisioningId/${CONNECTION_COLL}`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  async (req, res) => {
    const data = {
      ...req.body,
      id: generateId(req.body.name),
      whenCreated: new Date(),
      enabled: false,
      status: "New",
    };

    const connection = await connectionService.getData(
      req.params.id,
      req.params.provisioningId,
      data.id
    );
    if (connection.name) {
      console.log("connection exist", connection);
      return res.status(409).send("Item exists");
    }

    run(
      res,
      () =>
        connectionService.setData.apply(
          connectionService,
          [data].concat([req.params.id, req.params.provisioningId, data.id])
        ),
      undefined,
      undefined,
      data
    );
  }
);

routerConnection.put(
  `/:id/${PROVISIONING_COLL}/:provisioningId/${CONNECTION_COLL}/:connectionId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = {
      ...req.body,
      whenUpdated: new Date(),
      enabled: true,
      status: "Updated",
    };
    run(res, () =>
      connectionService.updateData.apply(
        connectionService,
        [data].concat([
          req.params.id,
          req.params.provisioningId,
          req.params.connectionId,
        ])
      )
    );
  }
);

routerConnection.delete(
  `/:id/${PROVISIONING_COLL}/:provisioningId/${CONNECTION_COLL}/:connectionId`,
  GuardLeast.check(undefined, [["Ops:Admin"]]),
  (req, res) => {
    const data = {};
    run(res, () =>
      connectionService.deleteData.apply(
        connectionService,
        [data].concat([
          req.params.id,
          req.params.provisioningId,
          req.params.connectionId,
        ])
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
