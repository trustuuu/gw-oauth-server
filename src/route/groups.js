import express from "express";
//const { default: express } = await import("express");
import groupService from "../service/group-service.js";
import {
  DOMAIN_COLL,
  GROUP_COLL,
  USER_COLL,
  generateId,
} from "../service/remote-path-service.js";
//import { GuardLeast } from "../../igwGuard.js";

const routerGroup = express.Router();
const memberPath = "members";

export default routerGroup;

routerGroup.get(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    if (req.query.condition) {
      run(res, () =>
        groupService.getGroupsWhere(
          req.params.id,
          req.params.domainId,
          req.query.condition
        )
      );
    } else {
      run(res, () => groupService.getData(req.params.id, req.params.domainId));
    }
  }
);

routerGroup.get(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      groupService.getData(
        req.params.id,
        req.params.domainId,
        req.params.groupId
      )
    );
  }
);

routerGroup.get(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId/${memberPath}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      groupService.getGroupMembers(
        req.params.id,
        req.params.domainId,
        req.params.groupId
      )
    );
  }
);

routerGroup.post(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}`,
  ////GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  async (req, res) => {
    console.log("req.body", req.body);
    const id = generateId(
      req.body.name ?? req.body.displayName.replace(/\s+/g, "")
    );
    const data = {
      ...req.body,
      id,
      //Identifier: req.body.Identifier ?? id,
      whenCreated: new Date(),
      status: "New",
    };

    const group = await groupService.getData(
      req.params.id,
      req.params.domainId,
      data.id
    );
    if (group.name) {
      console.log("group exist", group);
      return res.status(409).send("Item exists");
    }

    run(
      res,
      () =>
        groupService.setData.apply(
          groupService,
          [data].concat([req.params.id, req.params.domainId, data.id])
        ),
      undefined,
      undefined,
      data
    );
  }
);

routerGroup.post(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId/${memberPath}`,
  ////GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  async (req, res) => {
    if (Array.isArray(req.body)) {
      const data = [...req.body];
      const allAdds = data.map((itemTemp) => {
        const item = {
          ...itemTemp,
          id: itemTemp.value,
          $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
            itemTemp.type == "user" ? USER_COLL : GROUP_COLL
          }/${itemTemp.value}`,
          whenCreated: new Date(),
        };
        return groupService.setData.apply(
          groupService,
          [{ ...item, whenCreated: new Date() }].concat([
            req.params.id,
            req.params.domainId,
            req.params.groupId,
            memberPath,
            item.id,
          ])
        );
      });
      run(res, () => Promise.all(allAdds));
    } else {
      const data = {
        ...req.body,
        id: req.body.value,
        $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
          req.body.type == "user" ? USER_COLL : GROUP_COLL
        }/${req.body.value}`,
        whenCreated: new Date(),
      };
      run(
        res,
        () =>
          groupService.setData.apply(
            groupService,
            [data].concat([
              req.params.id,
              req.params.domainId,
              req.params.groupId,
              memberPath,
              data.id,
            ])
          ),
        undefined,
        undefined,
        data
      );
    }
  }
);

routerGroup.put(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body, whenUpdated: new Date() };
    run(res, () =>
      groupService.updateData.apply(
        groupService,
        [data].concat([req.params.id, req.params.domainId, req.params.groupId])
      )
    );
  }
);

routerGroup.put(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allUpdates = data.map((item) => {
      return groupService.updateData.apply(
        groupService,
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

routerGroup.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId/${memberPath}/:memberId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    run(res, () =>
      groupService.deleteData.apply(
        groupService,
        [null].concat([
          req.params.id,
          req.params.domainId,
          req.params.groupId,
          memberPath,
          req.params.memberId,
        ])
      )
    );
  }
);

routerGroup.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId/${memberPath}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return groupService.deleteData.apply(
        groupService,
        [null].concat([
          req.params.id,
          req.params.domainId,
          req.params.groupId,
          memberPath,
          item.id,
        ])
      );
    });
    run(res, () => Promise.all(allDeletes));
  }
);

routerGroup.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = { ...req.body };
    run(res, () =>
      groupService.deleteData.apply(
        groupService,
        [data].concat([req.params.id, req.params.domainId, req.params.groupId])
      )
    );
  }
);

routerGroup.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
      return groupService.deleteData.apply(
        groupService,
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
