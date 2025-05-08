import { getUserById } from "./auth_service.js";

async function getSession(req, res, routerAuth) {
  if (!req.cookies.user)
    return res.status(404).json({ error: "Token not found" });

  const { companyId, domainId, userId, sessionId } = JSON.parse(
    req.cookies.user
  );
  if (!userId) return res.status(404).json({ error: "Not logged in" });
  const user = await getUserById(companyId, domainId, userId);
  if (user) {
    if (user.session.sessionId === sessionId) {
      res.json({ accessToken: user.session.accessToken });
    } else {
      return res.status(404).json({ error: "Token not found" });
    }
  } else {
    return res.status(404).json({ error: "Token not found" });
  }
}

export default getSession;
