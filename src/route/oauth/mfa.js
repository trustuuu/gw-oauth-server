import { getQRCodeImageUrl, verifyMfaToken } from "../../helper/otp.js";
import { buildQueryUrl } from "../../helper/secure.js";
import {
  buildUrl,
  decryptPayload,
  encryptPayload,
  toBase32,
} from "../../helper/utils.js";
import { AUTH_PATH } from "../../service/remote-path-service.js";
import reqidService from "../../service/reqid-service.js";

export const mfaGet = async (req, res, routerAuth) => {
  const txId = req.query.tx;
  const tx = await reqidService.getData(AUTH_PATH, txId);

  if (!tx || tx.stage !== "mfa") return res.status(400).send("Invalid tx");

  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MFA Verification</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #3b82f6, #4f46e5);
      font-family: Arial, sans-serif;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      max-width: 400px;
      width: 100%;
      text-align: center;
    }
    h1 {
      color: #2563eb;
      margin-bottom: 0.5rem;
    }
    p {
      color: #555;
      margin-bottom: 1.5rem;
    }
    input[type="text"] {
      width: 100%;
      font-size: 2rem;
      letter-spacing: 0.5rem;
      text-align: center;
      padding: 0.5rem;
      border: 2px solid #3b82f6;
      border-radius: 0.5rem;
      outline: none;
      margin-bottom: 1rem;
    }
    input[type="text"]:focus {
      border-color: #1d4ed8;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
    }
    button {
      width: 100%;
      padding: 0.75rem;
      background: #2563eb;
      color: white;
      font-size: 1rem;
      font-weight: bold;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #1d4ed8;
    }
    .resend {
      font-size: 0.9rem;
      margin-top: 1rem;
      color: #555;
    }
    .resend a {
      color: #2563eb;
      text-decoration: none;
    }
    .resend a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Multi-Factor Authentication</h1>
    <p>Enter the 6-digit code from your authenticator app</p>

    <form method="POST" action="verifyTotp">
      <input
        type="text"
        name="totp"
        maxlength="6"
        inputmode="numeric"
        pattern="[0-9]*"
        placeholder="••••••"
        autocomplete="one-time-code"
      />
      <input type="hidden" name="txId" value=${txId} />
      <button type="submit">Verify</button>
    </form>

    <p class="resend">Didn’t receive a code? <a href="/mfa/resend">Resend</a></p>
  </div>
</body>
</html>`);
};

export const mfaPost = async (req, res, routerAuth) => {
  const tx = await reqidService.getData(AUTH_PATH, req.body.tx);

  if (!tx || tx.stage !== "mfa") return res.status(400).send("Invalid tx");

  const { totp } = req.body;
  const ok = await verifyTotp(
    `${tx.userId}${process.env.TOTP_SECRET}`
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase(),
    totp
  ); // your TOTP/WebAuthn verification
  if (!ok) return res.status(401).send("Invalid code");

  tx.amr.push("otp");
  tx.acr = "urn:mfa.required";
  tx.stage = "consent";

  await reqidService.deleteData.apply(
    reqidService,
    [{}].concat([AUTH_PATH, req.body.code])
  );

  const redirectURL = await buildQueryUrl("../../approve", tx);
  res.redirect(redirectURL);

  return; // res.redirect(`/approve?tx=${tx.txId}`);
};

const APP_SECRET = process.env.APP_SECRET || "change-me-32-bytes-or-env";
export const mfaQuery = async (req, res, routerAuth) => {
  const email = req.query.email;
  const userId = req.query.userId;
  const domain = req.query.domain;
  const payload = { e: email, u: userId, d: domain, ts: Date.now() }; // ts = ms since epoch
  const token = encryptPayload(payload, APP_SECRET);
  //const url = `https://your.site/secure-page?token=${encodeURIComponent(token)}`;
  res.json({ token });
};

export const mfaImage = async (req, res, routerAuth) => {
  const token = req.query.token;
  const { e, u, d, ts } = decryptPayload(token, APP_SECRET);

  if (
    typeof e !== "string" ||
    typeof u !== "string" ||
    typeof d !== "string" ||
    typeof ts !== "number"
  ) {
    return res.status(400).send("Invalid token data");
  }

  const maxAgeMs = 5 * 60 * 1000; // 5 minutes
  if (Date.now() - ts > maxAgeMs) {
    return res.status(401).send("Link expired");
  }
  const codeImage = await getQRCodeImageUrl(
    d,
    e,
    //process.env.TOTP_SECRET
    toBase32(
      `${u}${process.env.TOTP_SECRET}`
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
    )
  );
  return res.status(200).json(codeImage);
};

export const mfaVerify = async (req, res, routerAuth) => {
  const { totp, user, txId } = req.body;
  if (txId) {
    const tx = await reqidService.getData(AUTH_PATH, txId);
    const authorizationEndpoint =
      process.env.NODE_ENV === "dev"
        ? routerAuth.locals.authorizationEndpointDev
        : routerAuth.locals.authorizationEndpoint;

    const authorizeUrl = await buildUrl(authorizationEndpoint, tx);
    res.redirect(authorizeUrl);
  } else {
    const ok = await verifyTotp(
      //process.env.TOTP_SECRET,
      toBase32(
        `${user}${process.env.TOTP_SECRET}`
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase()
      ),
      totp
    );
    if (!ok) return res.status(401).send("Invalid code");

    return res.status(200).send("ok");
  }
};

const verifyTotp = async (secretBase32, code) => {
  const ok = verifyMfaToken(secretBase32, code);
  return ok;
};

export const getDecryptMfaLink = async (req, res, routerAuth) => {
  const token = req.body.token;
  const payload = decryptPayload(token, APP_SECRET);
  const { e, u, d, ts } = payload;

  if (
    typeof e !== "string" ||
    typeof u !== "string" ||
    typeof d !== "string" ||
    typeof ts !== "number"
  ) {
    return res.status(400).send("Invalid token data");
  }

  const maxAgeMs = 5 * 60 * 1000; // 5 minutes
  if (Date.now() - ts > maxAgeMs) {
    return res.status(401).send("Link expired");
  }
  return res.status(200).json(payload);
};
