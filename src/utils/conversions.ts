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
