import { test, expect } from 'vitest';
import { toBigIntLE, toBytesLE } from "../src/utils/conversions.ts";

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
