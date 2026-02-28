import { test, expect } from 'vitest';
import { calculateKeyPair, convertMont, inverseMod, toBigIntLE, toBytesLE } from "../src/utils/conversions.ts";
import type { point } from '../src/types/parameters.js';
import { FIELD_MODULUS_25519, FIELD_MODULUS_448, Q_25519, Q_448 } from '../src/types/parameters.js';

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
    const point: point = convertMont(uBytes);

    const u = 5n;
    const rhs = (1n + u) % FIELD_MODULUS_448;
    const lhs = (point.y * ((1n - u + FIELD_MODULUS_448) % FIELD_MODULUS_448)) % FIELD_MODULUS_448;

    expect(point.sign).toBe(0);
    expect(lhs).toBe(rhs);
});

test('calculateKeyPair should return expected A and reduced a for curve25519', () => {
    const k = new Uint8Array(32);
    k[0] = 1;
    k[31] = 0x7f;

    const { A, a } = calculateKeyPair(k, 'curve25519');

    const baseU = new Uint8Array(32);
    baseU[0] = 9;
    const expectedBase = convertMont(baseU);

    expect(A).toEqual({ y: expectedBase.y, sign: 0 });
    expect(a).toBe(toBigIntLE(k) % Q_25519);
});

test('calculateKeyPair should return expected A and reduced a for curve448', () => {
    const k = new Uint8Array(56);
    k[0] = 5;
    k[55] = 0xaa;

    const { A, a } = calculateKeyPair(k, 'curve448');

    const baseU = new Uint8Array(56);
    baseU[0] = 5;
    const expectedBase = convertMont(baseU);

    expect(A).toEqual({ y: expectedBase.y, sign: 0 });
    expect(a).toBe(toBigIntLE(k) % Q_448);
});

test('calculateKeyPair should reduce large scalar modulo curve order', () => {
    const k25519 = toBytesLE(Q_25519 + 123n, 64);
    const k448 = toBytesLE(Q_448 + 456n, 80);

    const pair25519 = calculateKeyPair(k25519, 'curve25519');
    const pair448 = calculateKeyPair(k448, 'curve448');

    expect(pair25519.a).toBe(123n);
    expect(pair448.a).toBe(456n);
});

test('calculateKeyPair should return zero scalar when k is zero', () => {
    const zero25519 = new Uint8Array(32);
    const zero448 = new Uint8Array(56);

    const pair25519 = calculateKeyPair(zero25519, 'curve25519');
    const pair448 = calculateKeyPair(zero448, 'curve448');

    expect(pair25519.a).toBe(0n);
    expect(pair448.a).toBe(0n);
    expect(pair25519.A.sign).toBe(0);
    expect(pair448.A.sign).toBe(0);
});
