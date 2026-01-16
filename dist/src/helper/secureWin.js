// --- NTLMv1 hash = MD4(UTF-16LE(password)) --- //
import md5 from "blueimp-md5";
export function ntlmV1HashHex(password) {
    const bytes = utf16leBytes(password);
    return md4Hex(bytes);
}
export function convertPassword(body) {
    if (body.authVerification) {
        return md5(body.authVerification);
    }
    if (body.password) {
        if (body.password.startsWith("MD5"))
            return body.password.slice(3);
        else if (body.password.startsWith("NTLM"))
            return body.password; //.slice(4);
        else
            return md5(body.password);
    }
    else {
        return "";
    }
}
function utf16leBytes(str) {
    const out = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        out[i * 2] = c & 0xff;
        out[i * 2 + 1] = c >>> 8;
    }
    return out;
}
function md4Hex(bytes) {
    const digest = md4(bytes);
    return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// ---- Minimal MD4 (RFC 1320) ----
function md4(messageBytes) {
    const msg = new Uint8Array(messageBytes);
    const len = msg.length;
    const bitLen = len * 8;
    // padding
    const withOne = new Uint8Array((len + 9 + 63) & ~63);
    withOne.set(msg, 0);
    withOne[len] = 0x80;
    // append length (64-bit LE)
    const dv = new DataView(withOne.buffer);
    dv.setUint32(withOne.length - 8, bitLen >>> 0, true);
    dv.setUint32(withOne.length - 4, Math.floor(bitLen / 2 ** 32) >>> 0, true);
    let A = 0x67452301, B = 0xefcdab89, C = 0x98badcfe, D = 0x10325476;
    const F = (x, y, z) => (x & y) | (~x & z);
    const G = (x, y, z) => (x & y) | (x & z) | (y & z);
    const H = (x, y, z) => x ^ y ^ z;
    const rotl = (x, n) => (x << n) | (x >>> (32 - n));
    for (let i = 0; i < withOne.length; i += 64) {
        const X = new Uint32Array(16);
        for (let j = 0; j < 16; j++)
            X[j] = dv.getUint32(i + j * 4, true);
        let a = A, b = B, c = C, d = D;
        // Round 1
        const r1 = [3, 7, 11, 19];
        for (let j = 0; j < 16; j++) {
            let t;
            if (j % 4 === 0) {
                const temp = (a + F(b, c, d) + X[j]) >>> 0;
                a = rotl(temp, r1[j % 4]);
            }
            if (j % 4 === 1) {
                const temp = (d + F(a, b, c) + X[j]) >>> 0;
                d = rotl(temp, r1[j % 4]);
            }
            if (j % 4 === 2) {
                const temp = (c + F(d, a, b) + X[j]) >>> 0;
                c = rotl(temp, r1[j % 4]);
            }
            if (j % 4 === 3) {
                const temp = (b + F(c, d, a) + X[j]) >>> 0;
                b = rotl(temp, r1[j % 4]);
            }
        }
        // Round 2
        const r2 = [3, 5, 9, 13], K2 = 0x5a827999;
        const idx2 = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15];
        for (let j = 0; j < 16; j++) {
            const x = X[idx2[j]];
            if (j % 4 === 0) {
                const temp = (a + G(b, c, d) + x + K2) >>> 0;
                a = rotl(temp, r2[j % 4]);
            }
            if (j % 4 === 1) {
                const temp = (d + G(a, b, c) + x + K2) >>> 0;
                d = rotl(temp, r2[j % 4]);
            }
            if (j % 4 === 2) {
                const temp = (c + G(d, a, b) + x + K2) >>> 0;
                c = rotl(temp, r2[j % 4]);
            }
            if (j % 4 === 3) {
                const temp = (b + G(c, d, a) + x + K2) >>> 0;
                b = rotl(temp, r2[j % 4]);
            }
        }
        // Round 3
        const r3 = [3, 9, 11, 15], K3 = 0x6ed9eba1;
        const idx3 = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];
        for (let j = 0; j < 16; j++) {
            const x = X[idx3[j]];
            if (j % 4 === 0) {
                const temp = (a + H(b, c, d) + x + K3) >>> 0;
                a = rotl(temp, r3[j % 4]);
            }
            if (j % 4 === 1) {
                const temp = (d + H(a, b, c) + x + K3) >>> 0;
                d = rotl(temp, r3[j % 4]);
            }
            if (j % 4 === 2) {
                const temp = (c + H(d, a, b) + x + K3) >>> 0;
                c = rotl(temp, r3[j % 4]);
            }
            if (j % 4 === 3) {
                const temp = (b + H(c, d, a) + x + K3) >>> 0;
                b = rotl(temp, r3[j % 4]);
            }
        }
        A = (A + a) >>> 0;
        B = (B + b) >>> 0;
        C = (C + c) >>> 0;
        D = (D + d) >>> 0;
    }
    const out = new Uint8Array(16);
    const dvOut = new DataView(out.buffer);
    dvOut.setUint32(0, A, true);
    dvOut.setUint32(4, B, true);
    dvOut.setUint32(8, C, true);
    dvOut.setUint32(12, D, true);
    return out;
}
