import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config(); //{ path: ".env.development" });
const subtle = crypto.webcrypto
    ? crypto.webcrypto.subtle
    : crypto.subtle;
const getRandomValues = crypto.webcrypto
    ? crypto.webcrypto.getRandomValues.bind(crypto.webcrypto)
    : crypto.getRandomValues;
function arrayBufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
function hexToArrayBuffer(hex) {
    if (!hex)
        return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes.buffer;
}
async function getCryptoKey(password) {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(password);
    return subtle.importKey("raw", keyMaterial, { name: "PBKDF2" }, false, [
        "deriveKey",
    ]);
}
async function deriveKey(password, salt) {
    const keyMaterial = await getCryptoKey(password);
    return subtle.deriveKey({
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
    }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function encryptText(text, password) {
    const encoder = new TextEncoder();
    const salt = getRandomValues(new Uint8Array(16));
    const iv = getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encoder.encode(text));
    return {
        cipherText: arrayBufferToHex(encrypted),
        iv: arrayBufferToHex(iv),
        salt: arrayBufferToHex(salt),
    };
}
export async function decryptText(encryptedData, password) {
    const { cipherText, iv, salt } = encryptedData;
    if (!salt)
        return null;
    const saltBuffer = hexToArrayBuffer(salt);
    if (!saltBuffer)
        return null; // Should not happen if salt is check
    const key = await deriveKey(password, saltBuffer);
    const ivBuffer = hexToArrayBuffer(iv);
    const ctBuffer = hexToArrayBuffer(cipherText);
    if (!ivBuffer || !ctBuffer)
        return null;
    const decrypted = await subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, ctBuffer);
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
export async function buildQueryUrl(baseUrl, params) {
    const encripedParams = await encryptText(JSON.stringify(params), process.env.ENCRIPTION_PASSWORD || "");
    return `${baseUrl}?d=${encripedParams.cipherText}&i=${encripedParams.iv}&s=${encripedParams.salt}`;
}
export function parseQuery(encrypedParams) {
    return {
        cipherText: encrypedParams.d,
        iv: encrypedParams.i,
        salt: encrypedParams.s,
    };
}
