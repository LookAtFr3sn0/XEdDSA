import type { P } from "../types/parameters.ts";

const FIELD_MODULUS_25519 = (1n << 255n) - 19n;
const FIELD_MODULUS_448 = (1n << 448n) - (1n << 224n) - 1n;

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

export function convertMont(u: Uint8Array): P {
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

    const p: P = {
        y: uToY(masked, fieldModulus, isCurve25519),
        sign: 0
    };
    return p;
}
