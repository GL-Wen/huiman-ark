// Pure TypeScript zero-dependency ZIP archive builder (Store mode)
// Perfect for PNG/JPEG images which are already compressed.

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c;
}

export function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  data: Uint8Array;
}

export function createZipArchive(files: ZipFileInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const filenameBytes = encoder.encode(file.name);
    const crc = computeCrc32(file.data);
    const size = file.data.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true); // signature
    localView.setUint16(4, 20, true);         // version needed (2.0)
    localView.setUint16(6, 0x0800, true);     // flags: UTF-8 filename (bit 11)
    localView.setUint16(8, 0, true);          // compression method: 0 (stored)
    localView.setUint16(10, 0, true);         // mod time
    localView.setUint16(12, 0, true);         // mod date
    localView.setUint32(14, crc, true);       // crc32
    localView.setUint32(18, size, true);      // compressed size
    localView.setUint32(22, size, true);      // uncompressed size
    localView.setUint16(26, filenameBytes.length, true); // filename length
    localView.setUint16(28, 0, true);         // extra field length
    localHeader.set(filenameBytes, 30);

    localHeaders.push(localHeader, file.data);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true); // signature
    centralView.setUint16(4, 20, true);          // version made by
    centralView.setUint16(6, 20, true);          // version needed
    centralView.setUint16(8, 0x0800, true);      // flags: UTF-8 filename
    centralView.setUint16(10, 0, true);          // compression method: 0
    centralView.setUint16(12, 0, true);          // mod time
    centralView.setUint16(14, 0, true);          // mod date
    centralView.setUint32(16, crc, true);        // crc32
    centralView.setUint32(20, size, true);       // compressed size
    centralView.setUint32(24, size, true);       // uncompressed size
    centralView.setUint16(28, filenameBytes.length, true); // filename length
    centralView.setUint16(30, 0, true);          // extra field length
    centralView.setUint16(32, 0, true);          // comment length
    centralView.setUint16(34, 0, true);          // disk number start
    centralView.setUint16(36, 0, true);          // internal file attributes
    centralView.setUint32(38, 0, true);          // external file attributes
    centralView.setUint32(42, offset, true);     // relative offset of local header
    centralHeader.set(filenameBytes, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + size;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true); // signature
  eocdView.setUint16(4, 0, true);          // disk number
  eocdView.setUint16(6, 0, true);          // disk with central directory
  eocdView.setUint16(8, files.length, true);  // entries on this disk
  eocdView.setUint16(10, files.length, true); // total entries
  eocdView.setUint32(12, centralDirSize, true); // size of central directory
  eocdView.setUint32(16, centralDirOffset, true); // offset of central directory
  eocdView.setUint16(20, 0, true);         // comment length

  // Combine everything
  const totalLength = centralDirOffset + centralDirSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const piece of localHeaders) {
    result.set(piece, pos);
    pos += piece.length;
  }
  for (const piece of centralHeaders) {
    result.set(piece, pos);
    pos += piece.length;
  }
  result.set(eocd, pos);

  return result;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
