import { brotliDecompressSync } from 'node:zlib';

// Reading what a font file can draw, straight from its bytes: a TrueType file's tables, or a WOFF2
// file's, which are the same tables compressed together with Brotli (https://www.w3.org/TR/WOFF2/).
// Only untransformed tables are read; WOFF2 transforms glyf, loca and hmtx at most, never cmap.

// The tags WOFF2 names by number in its table directory (§5.1), in order.
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** One table of a TrueType (sfnt) file, by tag. */
export function sfntTable(font, tag) {
  const tables = font.readUInt16BE(4);
  for (let index = 0; index < tables; index += 1) {
    const record = 12 + index * 16;
    if (font.toString('latin1', record, record + 4) === tag) {
      const offset = font.readUInt32BE(record + 8);
      return font.subarray(offset, offset + font.readUInt32BE(record + 12));
    }
  }
  return null;
}

/** One table of a WOFF2 file, by tag, decompressed. */
export function woff2Table(file, tag) {
  if (file.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file');
  const tables = file.readUInt16BE(12);
  const compressedLength = file.readUInt32BE(20);
  let position = 48;
  const base128 = () => {
    let value = 0;
    for (let index = 0; index < 5; index += 1) {
      const byte = file[position];
      position += 1;
      value = value * 128 + (byte & 0x7F);
      if (!(byte & 0x80)) return value;
    }
    throw new Error('bad UIntBase128');
  };
  const directory = [];
  for (let index = 0; index < tables; index += 1) {
    const flags = file[position];
    position += 1;
    let name = KNOWN_TAGS[flags & 0x3F];
    if ((flags & 0x3F) === 63) {
      name = file.toString('latin1', position, position + 4);
      position += 4;
    }
    const version = flags >> 6;
    const length = base128();
    // glyf and loca are transformed unless their version is 3; hmtx and every other table, unless 0.
    const transformed = ['glyf', 'loca'].includes(name) ? version !== 3 : version !== 0;
    directory.push({ name, length: transformed ? base128() : length, transformed });
  }
  const stream = brotliDecompressSync(file.subarray(position, position + compressedLength));
  let offset = 0;
  for (const entry of directory) {
    if (entry.name === tag) {
      if (entry.transformed) throw new Error(`${tag} is transformed`);
      return stream.subarray(offset, offset + entry.length);
    }
    offset += entry.length;
  }
  return null;
}

/** Every character a cmap table maps to a glyph (formats 4 and 12, the two Google's fonts use). */
export function cmapCharacters(cmap) {
  const mapped = new Set();
  const subtables = cmap.readUInt16BE(2);
  for (let index = 0; index < subtables; index += 1) {
    const offset = cmap.readUInt32BE(4 + index * 8 + 4);
    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segments = cmap.readUInt16BE(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let segment = 0; segment < segments; segment += 1) {
        const end = cmap.readUInt16BE(ends + segment * 2);
        const start = cmap.readUInt16BE(starts + segment * 2);
        const delta = cmap.readUInt16BE(deltas + segment * 2);
        const rangeOffset = cmap.readUInt16BE(ranges + segment * 2);
        for (let code = start; code <= end && code !== 0xFFFF; code += 1) {
          const glyph = rangeOffset === 0
            ? (code + delta) & 0xFFFF
            : cmap.readUInt16BE(ranges + segment * 2 + rangeOffset + (code - start) * 2);
          if (glyph !== 0) mapped.add(code);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let group = 0; group < groups; group += 1) {
        const start = cmap.readUInt32BE(offset + 16 + group * 12);
        const end = cmap.readUInt32BE(offset + 20 + group * 12);
        for (let code = start; code <= end; code += 1) mapped.add(code);
      }
    }
  }
  return mapped;
}
