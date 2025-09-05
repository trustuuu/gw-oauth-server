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
    run(res, async () => {
      const group = await groupService.getData(
        req.params.id,
        req.params.domainId,
        req.params.groupId
      );
      return group.members;
      // const group = groupService.getGroupMembers(
      //   req.params.id,
      //   req.params.domainId,
      //   req.params.groupId
      // );
      // console.log("group.member", group);
      // return group;
    });
  }
);

routerGroup.post(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}`,
  ////GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  async (req, res) => {
    const id = generateId(
      req.body.name ?? req.body.displayName.replace(/\s+/g, "")
    );

    const members = !req.body.members
      ? []
      : req.body.members.map((m) => ({
          type: m.type,
          value: m.value,
          $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
            m.type == "user" ? USER_COLL : GROUP_COLL
          }/${m.value}`,
          whenUpdated: new Date(),
        }));

    const data = {
      ...req.body,
      members,
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
          type: itemTemp.type,
          value: itemTemp.id ?? itemTemp.value,
          //id: itemTemp.value,
          $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
            itemTemp.type == "user" ? USER_COLL : GROUP_COLL
          }/${itemTemp.id ?? itemTemp.value}`,
          whenUpdated: new Date(),
        };
        return item;
      });
      run(
        res,
        () =>
          groupService.updateData.apply(
            groupService,
            [{ members: allAdds }].concat([
              req.params.id,
              req.params.domainId,
              req.params.groupId,
            ])
          ),
        undefined,
        undefined,
        { members: allAdds }
      );
    } else {
      const data = {
        members: [
          {
            //...req.body,
            //id: req.body.value,
            type: req.body.type,
            value: req.body.id ?? req.body.value,
            $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
              req.body.type == "user" ? USER_COLL : GROUP_COLL
            }/${req.body.id}`,
            whenUpdated: new Date(),
          },
        ],
      };
      run(
        res,
        () =>
          groupService.updateData.apply(
            groupService,
            [data].concat([
              req.params.id,
              req.params.domainId,
              req.params.groupId,
              // memberPath,
              // data.id,
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
    const members = req.body.members.map((m) => ({
      type: m.type,
      value: m.value,
      $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
        m.type == "user" ? USER_COLL : GROUP_COLL
      }/${m.value}`,
      whenUpdated: new Date(),
    }));

    const data = { ...req.body, members, whenUpdated: new Date() };
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
      const members = item.members.map((m) => ({
        type: m.type,
        value: m.value,
        $ref: `/${req.params.id}/${DOMAIN_COLL}/${req.params.domainId}/${
          m.type == "user" ? USER_COLL : GROUP_COLL
        }/${m.value}`,
        whenUpdated: new Date(),
      }));

      return groupService.updateData.apply(
        groupService,
        [{ ...item, members, whenUpdated: new Date() }].concat([
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
  async (req, res) => {
    const excludes = [...req.body];

    const group = await groupService.getData(
      req.params.id,
      req.params.domainId,
      req.params.groupId
    );

    const members = group.members.filter(
      (item) => !excludes.map((e) => e.value).includes(item.value)
    );

    run(res, () =>
      groupService.updateData.apply(
        groupService,
        [{ members, whenUpdated: new Date() }].concat([
          req.params.id,
          req.params.domainId,
          req.params.groupId,
        ])
      )
    );
  }
);

routerGroup.delete(
  `/:id/${DOMAIN_COLL}/:domainId/${GROUP_COLL}/:groupId`,
  //GuardLeast.check(undefined, [["Ops:Admin"], ["tenant:admin"]]),
  async (req, res) => {
    const excludes = [{ ...req.body }];
    const group = await groupService.getData(
      req.params.id,
      req.params.domainId,
      req.params.groupId
    );

    const members = group.members.filter(
      (item) => !excludes.map((e) => e.value).includes(item.value)
    );

    run(res, () =>
      groupService.updateData.apply(
        groupService,
        [{ members, whenUpdated: new Date() }].concat([
          req.params.id,
          req.params.domainId,
          req.params.groupId,
        ])
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
