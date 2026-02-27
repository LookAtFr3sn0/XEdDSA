export function toBigIntLE(bytes: Uint8Array): bigint {
    let result = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) {
        result = (result << 8n) + BigInt(bytes[i] ?? 0);
    }
    return result;
}
