import { test, expect } from 'vitest';
import { convertMont, inverseMod, toBigIntLE, toBytesLE } from "../src/utils/conversions.ts";

const FIELD_MODULUS_25519 = (1n << 255n) - 19n;
const FIELD_MODULUS_448 = (1n << 448n) - (1n << 224n) - 1n;

test('toBigIntLE should convert Uint8Array to bigint correctly', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03]);
    const result = toBigIntLE(bytes);
    expect(result).toBe(0x030201n);
});

test('toBigIntLE should handle empty Uint8Array', () => {
    const bytes = new Uint8Array([]);
    const result = toBigIntLE(bytes);
    expect(result).toBe(0n);
});

test('toBigIntLE should handle Uint8Array with leading zeros', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x01]);
    const result = toBigIntLE(bytes);
    expect(result).toBe(0x010000n);
});

test('toBigIntLE should handle Uint8Array with all zeros', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00]);
    const result = toBigIntLE(bytes);
    expect(result).toBe(0n);
});

test('toBytesLE should convert bigint to Uint8Array correctly', () => {
    const value = 0x030201n;
    const result = toBytesLE(value, 3);
    expect(result).toEqual(new Uint8Array([0x01, 0x02, 0x03]));
});

test('toBytesLE should handle zero bigint', () => {
    const value = 0n;
    const result = toBytesLE(value, 3);
    expect(result).toEqual(new Uint8Array([0x00, 0x00, 0x00]));
});

test('toBytesLE should handle bigint with leading zeros', () => {
    const value = 0x010000n;
    const result = toBytesLE(value, 3);
    expect(result).toEqual(new Uint8Array([0x00, 0x00, 0x01]));
});

test('inverseMod should return multiplicative inverse modulo m', () => {
    const m = FIELD_MODULUS_25519;
    const a = 42n;
    const inv = inverseMod(a, m);
    expect((a * inv) % m).toBe(1n);
    expect(inverseMod(2n, 5n)).toBe(3n);
    expect(inverseMod(48n, 101n)).toBe(40n);
});

test('inverseMod should return 0 for zero input per XEdDSA spec', () => {
    expect(inverseMod(0n, FIELD_MODULUS_25519)).toBe(0n);
});

test('convertMont should map to a valid Edwards y', () => {
    const uBytes = new Uint8Array(32);
    uBytes[0] = 9;
    const point = convertMont(uBytes);

    const u = 9n;
    const lhs = point.y * (u + 1n) % FIELD_MODULUS_25519;
    const rhs = (u - 1n) % FIELD_MODULUS_25519;

    expect(point.sign).toBe(0);
    expect(lhs).toBe(rhs);
});

test('convertMont should return canonical non-negative y for u=0 on Curve25519', () => {
    const uBytes = new Uint8Array(32);
    const point = convertMont(uBytes);

    expect(point.sign).toBe(0);
    expect(point.y).toBe(FIELD_MODULUS_25519 - 1n);
    expect(point.y >= 0n && point.y < FIELD_MODULUS_25519).toBe(true);
});

test('convertMont should return canonical non-negative y for u=0 on Curve448', () => {
    const uBytes = new Uint8Array(56);
    const point = convertMont(uBytes);

    expect(point.sign).toBe(0);
    expect(point.y).toBe(1n);
    expect(point.y >= 0n && point.y < FIELD_MODULUS_448).toBe(true);
});

test('convertMont should reject invalid inputs', () => {
    expect(() => convertMont(new Uint8Array(31))).toThrow("Montgomery u-coordinate must be 32 bytes (Curve25519) or 56 bytes (Curve448)");
});

test('convertMont should map Curve448 to a valid Edwards y', () => {
    const uBytes = new Uint8Array(56);
    uBytes[0] = 5;
    const point = convertMont(uBytes);

    const u = 5n;
    const rhs = (1n + u) % FIELD_MODULUS_448;
    const lhs = (point.y * ((1n - u + FIELD_MODULUS_448) % FIELD_MODULUS_448)) % FIELD_MODULUS_448;

    expect(point.sign).toBe(0);
    expect(lhs).toBe(rhs);
});
