import QRCode from "qrcode";
import speakeasy from "speakeasy";

export const generateOtpAuthUrl = (
  issuer: string,
  accountName: string,
  base32: string
) => {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const query = new URLSearchParams({
    secret: base32,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${label}?${query.toString()}`;
};

//const url = getQRCodeImageUrl("MyApp", "alice@example.com", "JBSWY3DPEHPK3PXP");

export const getQRCodeImageUrl = async (
  issuer: string,
  accountName: string,
  base32: string
) => {
  const url = generateOtpAuthUrl(issuer, accountName, base32);
  const imageUrl = await QRCode.toDataURL(url);
  return imageUrl;
  //   QRCode.toDataURL(url, (err, imageUrl) => {
  //     if (err) throw err;
  //     console.log("QRCode imageUrl", imageUrl); // base64 PNG for <img src="...">
  //     return imageUrl;
  //   });
};

/**
 * Verify a 6-digit code (token) from Google Authenticator
 * @param {string} secretBase32 - The base32 secret saved for the user
 * @param {string} token - The 6-digit string from authenticator app
 * @returns {boolean}
 */
export const verifyMfaToken = (secretBase32: string, token: string) => {
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token, // the 6-digit entered by user
    window: 1, // allow ±30s clock drift
  });
};
