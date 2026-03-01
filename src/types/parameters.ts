export type point = {
    y: bigint;
    sign: number;
}

export const FIELD_MODULUS_25519 = (1n << 255n) - 19n;
export const FIELD_MODULUS_448 = (1n << 448n) - (1n << 224n) - 1n;
export const Q_25519 = (1n << 252n) + 27742317777372353535851937790883648493n;
export const Q_448 = (1n << 446n) - 13818066809895115352007386748515426880336692474882178609894547503885n;
export const A_25519 = 486662n;
export const A_448  = 156326n;
export const B_25519 = 8 * Math.ceil((Math.ceil(Math.log2(Number(FIELD_MODULUS_25519)) + 1) / 8));
export const B_448 = 8 * Math.ceil((Math.ceil(Math.log2(Number(FIELD_MODULUS_448)) + 1) / 8));

export type curve = 'curve25519' | 'curve448';
export type hash = 'sha-256' | 'sha-512';
