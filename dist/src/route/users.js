import express from "express";
//const { default: express } = await import("express");
import userService from "../service/user-service.js";
import { DOMAIN_COLL, USER_COLL, generateId, } from "../service/remote-path-service.js";
import md5 from "blueimp-md5";
import { ntlmV1HashHex, convertPassword } from "../helper/secureWin.js";
import { getQRCodeImageUrl } from "../helper/otp.js";
import { GuardLeast } from "../../igwGuard.js";
import { createPostHandler } from "../helper/httpHandler.js";
import accountService from "../service/account-service.js";
const routerUser = express.Router();
export default routerUser;
// Helper function to handle response
function run(response, fn, success, error, data, postFn) {
    return fn()
        .then((result) => {
        if (postFn) {
            postFn();
        }
        if (response.headersSent)
            return;
        response
            .status(200)
            .send(data ? data : success ? success(result) : result);
    })
        .catch((err) => {
        console.error(err);
        return response.status(500).send(error ? error(err) : err);
    });
}
import { parseScimFilter, applyProjection } from "../helper/filterHelper.js";
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, GuardLeast.check([["company:admin"]], [["Ops:Admin"], ["tenant:admin"]]), (req, res) => {
    let condition = req.query.condition;
    const filter = req.query.filter;
    const attributes = req.query.attributes;
    const excludedAttributes = req.query.excludedAttributes;
    if (filter) {
        const parsedFilter = parseScimFilter(filter);
        if (parsedFilter) {
            if (condition) {
                // If condition already exists (which triggers getUsersWhere), we might need to combine?
                // However, the original code had an if/else block.
                // If we want to support both, we should combine.
                // For now, let's assume filter overrides or extends condition logic if we can unify.
                // But req.query.condition is usually internal or specific.
                // The request is to "keep userService.getUsersWhere".
                // getUsersWhere takes a condition.
                condition = parsedFilter; // Replace or merge? "keep" likely means use the function.
            }
            else {
                condition = parsedFilter;
            }
        }
    }
    if (condition) {
        run(res, async () => {
            const users = await userService.getUsersWhere(req.params.id, req.params.domainId, condition);
            const mappedUsers = users.map(({ session, authVerification, ...rest }) => rest);
            return applyProjection(mappedUsers, attributes, excludedAttributes);
        });
    }
    else {
        run(res, async () => {
            const users = await userService.getData(req.params.id, req.params.domainId);
            const mappedUsers = users.map(({ session, authVerification, ...rest }) => rest);
            return applyProjection(mappedUsers, attributes, excludedAttributes);
        });
    }
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId`, (req, res) => {
    run(res, async () => {
        const user = await userService.getData(req.params.id, req.params.domainId, req.params.userId);
        if (user && user.session)
            delete user.session;
        if (user && user.authVerification)
            delete user.authVerification;
        return user;
    });
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/otp`, (req, res) => {
    run(res, async () => {
        const user = await userService.getData(req.params.id, req.params.domainId, req.params.userId);
        if (user && user.session)
            delete user.session;
        if (user && user.authVerification)
            delete user.authVerification;
        // const qrImageUrl = getQRCodeImageUrl(req.params.domainId, user.email, "JBSWY3DPEHPK3PXP");
        return user;
    });
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/qrImage`, async (req, res) => {
    const user = await userService.getData(req.params.id, req.params.domainId, req.params.userId);
    // const qrImageUrl = await getQRCodeImageUrl(
    //   req.params.domainId,
    //   user.email,
    //   req.params.userId, //"JBSWY3DPEHPK3PXP"
    // );
    run(res, () => getQRCodeImageUrl(req.params.domainId, user.email, req.params.userId //"JBSWY3DPEHPK3PXP"
    ));
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes`, (req, res) => {
    run(res, () => userService.getUserPermissionScopes(req.params.id, req.params.domainId, req.params.userId));
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts`, (req, res) => {
    run(res, () => userService.getExternalIdentityAccounts(req.params.id, req.params.domainId, req.params.userId));
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts/:accountId`, (req, res) => {
    run(res, () => userService.getExternalIdentityAccounts(req.params.id, req.params.domainId, req.params.userId, req.params.accountId));
});
routerUser.get(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/AppRoles`, (req, res) => {
    run(res, () => userService.getUserAppRoles(req.params.id, req.params.domainId, req.params.userId));
});
routerUser.post(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:email/verifyPassword`, (req, res) => {
    run(res, () => userService.userVerification(req.params.id, req.params.domainId, req.params.email, req.body.password));
});
routerUser.put(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:email/resetPassword`, async (req, res) => {
    const { id: companyId, domainId, email } = req.params;
    const users = await userService.getUserByEmail(companyId, domainId, email);
    const user = users ? users[0] : null;
    if (!user) {
        console.log("user is not found", req.params.email);
        return res.status(401).send("user or password is not found");
    }
    if (user.authVerification.startsWith("NTLM")) {
        if (user.authVerification.slice(4) != ntlmV1HashHex(req.body.password)) {
            console.log("user password is wrong", req.params.email);
            return res.status(401).send("user or password is not found");
        }
    }
    else {
        if (user.authVerification != md5(req.body.password)) {
            console.log("user password is wrong", req.params.email);
            return res.status(401).send("user or password is not found");
        }
    }
    run(res, () => {
        const data = { authVerification: md5(req.body.newPassword) };
        return userService.updateData(data, companyId, domainId, user.id);
    });
});
routerUser.post(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, async (req, res) => {
    const userName = req.body.userName
        ? req.body.userName
        : req.body.UserName
            ? req.body.UserName
            : req.body.username;
    const id = generateId(userName);
    const authVerification = convertPassword(req.body);
    let data = {
        ...req.body,
        id,
        //Identifier: id,
        userName,
        authVerification,
        whenCreated: new Date(),
        status: "new",
    };
    if (data.UserName)
        delete data.UserName;
    if (data.password)
        delete data.password;
    const user = await userService.getUserByEmail(req.params.id, req.params.domainId, data.email);
    if (user.length > 0) {
        return res.status(409).send("Item exists");
    }
    let postFn = null;
    if ("root" in data) {
        postFn = () => userService.createAuthUser(req.params.id, req.params.domainId, data.id);
    }
    run(res, () => userService.setData(data, req.params.id, req.params.domainId, data.id), undefined, undefined, data, postFn);
});
routerUser.post(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes`, createPostHandler(userService, (req) => [
    req.params.id,
    req.params.domainId,
    req.params.userId,
    "PermissionScopes",
]));
routerUser.post(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts`, createPostHandler(userService, (req) => [
    req.params.id,
    req.params.domainId,
    req.params.userId,
    "ExternalIdentityAccounts",
], {
    generateIdFn: (item) => generateId(item.name),
}));
routerUser.post(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts/:accountId`, async (req, res) => {
    run(res, () => userService.getExternalIdentityAccounts(req.params.id, req.params.domainId, req.params.userId, req.params.accountId));
});
routerUser.put(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId`, (req, res) => {
    let data = { ...req.body, whenUpdated: new Date() };
    if (req.body.password) {
        const authVerification = convertPassword(req.body);
        data = { ...req.body, authVerification, whenUpdated: new Date() };
    }
    if (data.password)
        delete data.password;
    run(res, () => userService.updateData(data, req.params.id, req.params.domainId, req.params.userId));
});
routerUser.put(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, (req, res) => {
    const data = [...req.body];
    const allUpdates = data.map((item) => {
        let itemData = { ...item, whenUpdated: new Date() };
        if (item.password) {
            const authVerification = convertPassword(item);
            itemData = { ...item, authVerification };
        }
        if (itemData.password)
            delete itemData.password;
        return userService.updateData(itemData, req.params.id, req.params.domainId, item.id);
    });
    run(res, () => Promise.all(allUpdates));
});
routerUser.put(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes/:scopeId`, (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () => userService.updateData(data, req.params.id, req.params.domainId, req.params.userId, "PermissionScopes", req.params.scopeId));
});
routerUser.put(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts/:accountId`, (req, res) => {
    const data = { ...req.body, whenUpdated: new Date(), status: "Updated" };
    run(res, () => userService.updateData(data, req.params.id, req.params.domainId, req.params.userId, "ExternalIdentityAccounts", req.params.accountId));
});
routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId`, (req, res) => {
    run(res, async () => {
        const user = await userService.getData(req.params.id, req.params.domainId, req.params.userId);
        if (user) {
            accountService.deleteData({}, user.email);
        }
        userService.deleteData({}, req.params.id, req.params.domainId, req.params.userId);
    });
});
routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}`, (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map(async (item) => {
        const user = await userService.getData(req.params.id, req.params.domainId, item.id);
        if (user) {
            console.log("user in delete", user);
            accountService.deleteData({}, user.email);
        }
        userService.deleteData(null, req.params.id, req.params.domainId, item.id);
    });
    run(res, () => Promise.all(allDeletes));
});
routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes/:scopeId`, (req, res) => {
    run(res, async () => userService.deleteData(null, req.params.id, req.params.domainId, req.params.userId, "PermissionScopes", req.params.scopeId));
});
routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/PermissionScopes`, (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
        return userService.deleteData(null, req.params.id, req.params.domainId, req.params.userId, "PermissionScopes", item.id);
    });
    run(res, () => Promise.all(allDeletes));
});
routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts/:accountId`, (req, res) => {
    run(res, () => userService.deleteData(null, req.params.id, req.params.domainId, req.params.userId, "ExternalIdentityAccounts", req.params.accountId));
});
routerUser.delete(`/:id/${DOMAIN_COLL}/:domainId/${USER_COLL}/:userId/ExternalIdentityAccounts`, (req, res) => {
    const data = [...req.body];
    const allDeletes = data.map((item) => {
        return userService.deleteData(null, req.params.id, req.params.domainId, req.params.userId, "ExternalIdentityAccounts", item.id);
    });
    run(res, () => Promise.all(allDeletes));
});
