import { getVerifyJwtWithJwks } from "../../../jwks.js";
import refreshTokenService from "../../service/refresh-token-service.js";
import { AUTH_PATH } from "../../service/remote-path-service.js";
import userService from "../../service/user-service.js";

export async function logout(req, res, routerAuth) {
  const { redirect_url } = req.query;
  const deviceId = req.headers[process.env.DEVICE_ID_HEADER];
  if (!req.cookies.user) {
    return res.status(404).json({ error: "Session not found" });
  }

  const { companyId, domainId, userId, sessionId } = JSON.parse(
    req.cookies.user
  );

  const user = await userService.getData(companyId, domainId, userId);

  //Check cookie cookie deviceId and refreshToken deviceId of user in server
  const refreshTokenBodyPlain = await getVerifyJwtWithJwks(
    user.session.refreshToken
  );
  if (deviceId !== refreshTokenBodyPlain.device_id) {
    console.log(
      `device_mismatch ${deviceId}:${refreshTokenBodyPlain.device_id}`
    );
    return res.status(401).json({ error: "device_mismatch" });
  }
  if (sessionId != user.session.sessionId) {
    console.log(`session_mismatch ${sessionId}:${user.session.sessionId}`);
    return res.status(401).json({ error: "session_mismatch" });
  }

  //Check cookie sessionId and refreshToken sessionId in server
  const refreshTokenServer = await refreshTokenService.getData(
    AUTH_PATH,
    deviceId
  );

  if (refreshTokenServer.refresh_token != refreshTokenBodyPlain.jti) {
    console.log(
      `refresh_token_mismatch ${refreshTokenServer.refresh_token}:${refreshTokenBodyPlain.jti}`
    );
    return res.status(401).json({ error: "refresh_token_mismatch" });
  }
  if (
    !refreshTokenServer ||
    companyId != refreshTokenServer.user.companyId ||
    domainId != refreshTokenServer.user.domainId
  ) {
    console.log(
      `session_information_mismatch ${companyId}:${refreshTokenServer.user.companyId}=>${domainId}:${refreshTokenServer.user.domainId}`
    );
    return res.status(401).json({ error: "session_information_mismatch" });
  }

  await refreshTokenService.deleteData.apply(
    refreshTokenService,
    [null].concat([AUTH_PATH, deviceId])
  );
  await userService.updateData({ session: null }, companyId, domainId, userId);

  req.session.destroy(() => {
    res.clearCookie("user", {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE,
      sameSite: "lax",
    });
    //res.status(200).send("Logged out");
    res.status(200).send({ success: true, redirect_url });
  });
}
