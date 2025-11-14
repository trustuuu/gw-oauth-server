import { saveTokenToDB } from "./auth_service.js";

async function callback(req, res, routerAuth) {
  try {
    const {
      companyId,
      domainId,
      email,
      accessToken,
      refreshToken,
      idToken,
      userId,
    } = req.body;
    const sessionId = req.sessionID; // ✅ 여기가 세션 ID
    const user = {
      companyId,
      domainId,
      userId,
      email,
      sessionId,
    };
    //쿠키는 최소한의 정보만 설정 (예: 닉네임은 UI용으로 클라이언트에서 사용)
    res.cookie("user", JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // DB에 sessionId와 함께 토큰 저장
    const data = {
      companyId,
      domainId,
      email,
      accessToken,
      refreshToken,
      idToken,
      userId,
      sessionId,
    };
    console.log("session data", data);

    await saveTokenToDB(data);
    await saveSession(req);
    res.send({ success: true, sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to create session" });
  }
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export default callback;
