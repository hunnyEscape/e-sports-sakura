// src/types/node-aes-cmac.d.ts
declare module 'node-aes-cmac' {
	export function aesCmac(key: Buffer, data: Buffer): string;
  }