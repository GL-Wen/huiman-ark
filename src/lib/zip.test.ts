import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createZipArchive, computeCrc32, base64ToUint8Array } from './zip.ts';

test('computeCrc32 calculates correct checksum', () => {
  const encoder = new TextEncoder();
  const data = encoder.encode('123456789');
  assert.equal(computeCrc32(data), 0xcbf43926);
});

test('createZipArchive produces a valid zip archive with entries', () => {
  const encoder = new TextEncoder();
  const file1 = { name: 'hello.txt', data: encoder.encode('Hello World!') };
  const file2 = { name: 'sub/test.txt', data: encoder.encode('Second file') };

  const zipData = createZipArchive([file1, file2]);
  assert.ok(zipData.length > 0);

  // Check signature at start
  const view = new DataView(zipData.buffer, zipData.byteOffset, zipData.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
});

test('base64ToUint8Array decodes base64 string accurately', () => {
  const text = 'Huiman Ark Test';
  const b64 = btoa(text);
  const dataUri = `data:image/png;base64,${b64}`;
  const decoded = base64ToUint8Array(dataUri);
  const decoder = new TextDecoder();
  assert.equal(decoder.decode(decoded), text);
});
