import * as R from "ramda";
import randomstring from "randomstring";
import { generateUserCode } from "../../helper/utils.js";
import { getClient } from "./auth_service.js";
import deviceService from "../../service/device-service.js";
import { APP_PATH, AUTH_PATH } from "../../service/remote-path-service.js";
import applicationService from "../../service/application-service.js";

export async function device_authorization(req, res, routerAuth) {
  const { client_id, scope } = req.body;
  const client = await getClient(client_id);
  if (!client) {
    console.log("invalid_client, %s", client_id);
    return res.status(400).json({ error: "invalid_client" });
  }

  let clientScopes = await applicationService.getApplicationPermissionScopes(
    APP_PATH,
    client_id
  );
  if (Array.isArray(clientScopes)) {
    clientScopes = clientScopes.map((s) => s.permission);
  }

  if (!Array.isArray(clientScopes)) {
    console.log("invalid_client_scope, %s", client_id);
    return res.status(400).json({ error: "invalid_client_scope" });
  }

  if (R.difference(scope.split(" "), clientScopes).length > 0) {
    console.log("invalid_scope, %s", scope);
    return res.status(400).json({ error: "invalid_scope" });
  }

  const device_code = randomstring.generate(64);
  const user_code = generateUserCode(
    process.env.USER_CODE_FORMAT.replace(/[A-Z0-9]/g, "A")
  );
  const data = {
    tenant_id: client.companyId,
    domain_id: client.domain,
    device_code,
    user_code,
    scope: scope.split(" "),
    verification_uri: process.env.VERIFICATION_URI,
    verification_uri_complete: `${process.env.VERIFICATION_URI}?user_code=${user_code}`,
    expires_in: 600,
    interval: 5,
    approved: false,
    whenCreated: new Date(),
  };
  await deviceService.setData.apply(
    deviceService,
    [data].concat([AUTH_PATH, device_code])
  );
  return res.status(200).json(data);
}
