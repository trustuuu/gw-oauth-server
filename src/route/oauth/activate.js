import deviceService from "../../service/device-service.js";
import { AUTH_PATH } from "../../service/remote-path-service.js";
import userService from "../../service/user-service.js";

export async function activate(req, res, routerAuth) {
  const { user_code, email } = req.body;
  console.log("user_code, email", user_code, email);
  const devices = await deviceService.getUserDevice(user_code);
  let device = devices ? devices[0] : null;
  if (!device) {
    console.log("device is not found with user_code", user_code);
    return res.status(401).send("device is not found");
  }

  console.log("device", device, device.tenant_id, device.domain_id);
  const users = await userService.getUserByEmail(
    device.tenant_id,
    device.domain_id,
    email
  );
  const user = users ? users[0] : null;
  if (!user) {
    console.log("user is not found", email);
    return res.status(401).send("user or password is not found");
  }

  device = {
    ...device,
    user_id: user.id,
    approved: true,
    rejected: false,
    whenUpdated: new Date(),
  };
  await deviceService.setData.apply(
    deviceService,
    [device].concat([AUTH_PATH, device.device_code])
  );

  return res.status(200).send("success");
}
