import crypto from "crypto";
import nodemailer from "nodemailer"; // For sending emails
import userService from "../service/user-service.js";
import { convertPassword } from "./secureWin.js"; // Note: secureWin.ts is available
export const requestPasswordReset = async (req, res) => {
    const { email, password } = req.body;
    const user = await userService.getUserRef(email);
    // 1. Generic response to prevent "email harvesting"
    if (!user) {
        return res
            .status(200)
            .json({ message: "Reset link sent if email exists." });
    }
    // 2. Create a secure random token (hex) and set expiry (e.g., 1 hour)
    //   const resetToken = JSON.stringify({
    //     email,
    //     token: crypto.randomBytes(32).toString("hex"),
    //   });
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(resetToken).digest("hex");
    let userData = {
        passwordResetToken: hash,
        passwordResetExpires: Date.now() + 3600000,
        tempPassword: password,
    };
    await userService.updateData.apply(userService, [userData].concat([user.companyId, user.domainId, user.id]));
    // 3. Send email with the RAW token (not the hash)
    const resetURL = `https://unidir.igoodworks.com/resetpw-link?token=${resetToken}&email=${email}`;
    console.log("resetURL", resetURL);
    // Example using Nodemailer
    const transporter = nodemailer.createTransport({
        host: process.env.NOTIFICATION_EMAIL_HOST,
        port: 587,
        secure: false, // Must be false for port 587
        auth: {
            user: process.env.NOTIFICATION_EMAIL,
            pass: process.env.NOTIFICATION_PW,
        },
        tls: {
            ciphers: "SSLv3", // Often required for older TLS compatibility with O365
            rejectUnauthorized: false, // Use with caution in production
        },
    });
    await transporter.sendMail({
        from: '"iGoodWorks Support" <support@igoodworks.com>',
        to: user.email,
        subject: "Password Reset Request",
        text: `Reset your password here: ${resetURL}\r\nTemporary password: ${password}`,
        html: `<b>Reset your password here:</b> <a href="${resetURL}">${resetURL}</a></br><b>Temporary password: ${password}`,
    });
    return res.status(200).json({ message: "Reset link sent if email exists." });
};
export const resetPassword = async (req, res) => {
    //const { email, token: tokenHash } = req.params;
    const { email, token: token, tempPassword, newPassword } = req.body;
    // 1. Hash the incoming token to compare with the stored version
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    // 2. Find user with valid token AND unexpired time
    const user = await userService.getUserRef(email);
    // 1. Generic response to prevent "email harvesting"
    if (!user) {
        console.log("User or Token is invalid or has expired.");
        return res
            .status(400)
            .json({ message: "Token is invalid or has expired." });
    }
    if (tokenHash != user.passwordResetToken ||
        user.passwordResetExpires < Date.now() ||
        tempPassword != user.tempPassword) {
        console.log("Token is invalid or has expired.");
        return res
            .status(400)
            .json({ message: "Token is invalid or has expired." });
    }
    // 3. Update password and clear reset fields
    const authVerification = convertPassword({ password: newPassword });
    const userData = {
        authVerification,
        passwordResetToken: "",
        passwordResetExpires: "", // Originally empty string. Using "" for now. Type should probably be string | number.
        tempPassword: "",
        whenUpdated: new Date(),
    };
    await userService.updateData.apply(userService, [userData].concat([user.companyId, user.domainId, user.id]));
    return res.status(200).json({ message: "Password updated successfully!" });
};
