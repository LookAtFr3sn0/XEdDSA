import type { point, curve, hash } from "../types/parameters.ts";
import { A_25519, A_448, FIELD_MODULUS_25519, FIELD_MODULUS_448, Q_25519, Q_448 } from "../types/parameters.ts";

export function toBigIntLE(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) {
        result = (result << 8n) + BigInt(bytes[i] ?? 0);
    }
    return result;
}

export function toBytesLE(value: bigint, length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Number(value & 0xFFn);
        value >>= 8n;
    }
    return bytes;
}

export function inverseMod(a: bigint, m: bigint): bigint {
    const aNorm = ((a % m) + m) % m;
    if (aNorm === 0n) {
        return 0n;
    }

    let t = 0n;
    let newT = 1n;
    let r = m;
    let newR = aNorm;

    while (newR !== 0n) {
        const q = r / newR;
        [t, newT] = [newT, t - q * newT];
        [r, newR] = [newR, r - q * newR];
    }

    if (r !== 1n) {
        throw new Error("Value is not invertible modulo m");
    }

    return (t % m + m) % m;
}

function uToY(u: bigint, fieldModulus: bigint, isCurve25519: boolean): bigint {
    const uNorm = u % fieldModulus;
    let y: bigint;
    if (isCurve25519) {
        y = (uNorm - 1n + fieldModulus) % fieldModulus * inverseMod((uNorm + 1n) % fieldModulus, fieldModulus) % fieldModulus;
    } else {
        y = (uNorm + 1n) % fieldModulus * inverseMod((1n - uNorm + fieldModulus) % fieldModulus, fieldModulus) % fieldModulus;
    }
    return (y + fieldModulus) % fieldModulus;
}

export function convertMont(u: Uint8Array): point {
    if (u.length !== 32 && u.length !== 56) {
        throw new Error("Montgomery u-coordinate must be 32 bytes (Curve25519) or 56 bytes (Curve448)");
    }

    const maskedBytes = u.slice();
    let fieldModulus = FIELD_MODULUS_448;
    let isCurve25519 = false;

    if (maskedBytes.length === 32) {
        maskedBytes[31]! &= 0x7f;
        fieldModulus = FIELD_MODULUS_25519;
        isCurve25519 = true;
    }

    const masked = toBigIntLE(maskedBytes);

    const point: point = {
        y: uToY(masked, fieldModulus, isCurve25519),
        sign: 0
    };
    return point;
}

export function calculateKeyPair(k: Uint8Array, curve: curve): { A: point; a: bigint } {
    const u = curve === 'curve25519' ? new Uint8Array(32) : new Uint8Array(56);
    u[0] = curve === 'curve25519' ? 9 : 5;
    const E = convertMont(u);
    const A: point = {
        y: E.y,
        sign: 0
    };
    let a;
    if (E.sign === 1) {
        a = -toBigIntLE(k) % (curve === 'curve25519' ? Q_25519 : Q_448);
    } else {
        a = toBigIntLE(k) % (curve === 'curve25519' ? Q_25519 : Q_448);
    }
    return { A, a };
}

export async function baseHash(X: Uint8Array, hash: hash): Promise<Uint8Array> {
    const input = X.slice().buffer;
    if (hash === 'sha-256') {
        return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
    } else {
        return new Uint8Array(await crypto.subtle.digest('SHA-512', input));
    }
}

export async function hash(X: Uint8Array, i: number, hash: hash, curve: curve = 'curve25519'): Promise<Uint8Array> {
    if (!Number.isInteger(i) || i < 0) throw new Error("hash index i must be a non-negative integer");

    const bBytes = curve === 'curve25519' ? 32 : 56;
    const max = (1n << BigInt(8 * bBytes)) - 1n;
    const prefixed = max - BigInt(i);
    if (prefixed < 0n) throw new Error("hash index i is too large for selected curve domain");

    const prefix = toBytesLE(prefixed, bBytes);
    const data = new Uint8Array(prefix.length + X.length);
    data.set(prefix, 0);
    data.set(X, prefix.length);
    return await baseHash(data, hash);
}

export function mod(a: bigint, p: bigint): bigint {
    return ((a % p) + p) % p;
}

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    if (modulus === 1n) return 0n;

    let result = 1n;
    let b = mod(base, modulus);
    let e = exponent;

    while (e > 0n) {
        if ((e & 1n) === 1n) {
            result = (result * b) % modulus;
        }
        b = (b * b) % modulus;
        e >>= 1n;
    }

    return result;
}

export function legendreSymbol(a: bigint, p: bigint): number {
    if (p <= 2n || (p & 1n) === 0n) {
        throw new Error("p must be an odd prime for Legendre symbol");
    }
    
    const aNorm = mod(a, p);
    if (aNorm === 0n) return 0;

    const value = modPow(aNorm, (p - 1n) / 2n, p);
    if (value === 1n) return 1;
    if (value === p - 1n) return -1;

    throw new Error("p must be an odd prime for Legendre symbol");
}

export function elligator2(r: bigint, curve: curve): bigint {
    const fieldModulus = curve === 'curve25519' ? FIELD_MODULUS_25519 : FIELD_MODULUS_448;
    const A = curve === 'curve25519' ? A_25519 : A_448;
    const n = curve === 'curve25519' ? 2n : fieldModulus - 1n;
    const u1 = mod(-A * inverseMod(1n + n * r * r, fieldModulus), fieldModulus);
    const w1 = mod(u1 * mod(u1 * u1 + A * u1 + 1n, fieldModulus), fieldModulus);
    if (legendreSymbol(w1, fieldModulus) === -1) {
        const u2 = mod(-A - u1, fieldModulus);
        return u2;
    }
    return u1;
}
