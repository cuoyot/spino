import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { Unzip, UnzipInflate } from 'fflate';

export const SCORE_LIMITS = { maxBytes: 25000000, maxInflated: 100000000, maxEntries: 256, maxMeasures: 20000, maxNotes: 200000 };
export const children = (node, name) => Array.from(node?.childNodes || []).filter(n => n.nodeType === 1 && (!name || n.localName === name));
export const child = (node, name) => children(node, name)[0] || null;
export const content = (node, name) => child(node, name)?.textContent.trim() || null;
export const serializeXML = node => new XMLSerializer().serializeToString(node);
export function xmlDocument(xml) {
  if (typeof xml !== 'string' || !xml.trim() || xml.length > SCORE_LIMITS.maxInflated) throw new Error('Empty or oversized XML score.');
  if (/<!ENTITY|<!\[|<\?xml-stylesheet|<\s*(?:\w+:)?(?:include|script|link|(?:credit-)?image)\b|\b(?:href|src)\s*=/i.test(xml)) throw new Error('External references, entities and active XML content are not supported.');
  // Standard MusicXML public DTD declarations are identifiers only: remove, never resolve them.
  xml = xml.replace(/<!DOCTYPE\s+score-partwise\s+PUBLIC\s+["']-\/\/Recordare\/\/DTD MusicXML [1-4]\.\d Partwise\/\/EN["']\s+["']https?:\/\/(?:www\.)?musicxml\.org\/dtds\/partwise\.dtd["']\s*>/g, '');
  if (/<!DOCTYPE/i.test(xml)) throw new Error('Custom or external XML declarations are not supported.');
  const document = new DOMParser({ onError: (level, message) => { throw new Error(`Invalid XML: ${message}`); } }).parseFromString(xml, 'application/xml');
  if (!document.documentElement) throw new Error('The XML document has no root element.');
  return document;
}
export function archivePath(path) {
  if (!path || /[\\\0:]/.test(path) || path.startsWith('/') || path.split('/').some(p => p === '..' || p === '.')) throw new Error(`Unsafe archive path: ${path}`);
  return path;
}
function unpack(bytes, limits) {
  const directory = zipDirectory(bytes, limits);
  const files = new Map(); let count = 0, inflated = 0, failure = null;
  const unzip = new Unzip(file => {
    if (++count > limits.maxEntries) throw new Error('Too many entries in the MXL archive.');
    archivePath(file.name);
    if (files.has(file.name)) throw new Error(`Duplicate archive entry: ${file.name}`);
    if (file.originalSize > limits.maxInflated) throw new Error('MXL decompression limit exceeded.');
    const chunks = []; let size = 0;
    files.set(file.name, null);
    file.ondata = (error, data, final) => {
      if (error) { failure = error; return; }
      inflated += data.length; size += data.length;
      if (inflated > limits.maxInflated) { file.terminate(); throw new Error('MXL decompression limit exceeded.'); }
      chunks.push(data);
      if (final) { const output = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } files.set(file.name, output); }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Small input chunks bound intermediate inflation allocations even with false ZIP sizes.
  for (let i = 0; i < bytes.length; i += 1024) unzip.push(bytes.subarray(i, i + 1024), i + 1024 >= bytes.length);
  if (failure || [...files.values()].some(value => value === null)) throw failure || new Error('Truncated MXL archive.');
  if (files.size !== directory.size) throw new Error('MXL archive directory does not match its entries.');
  for (const [name, data] of files) {
    const entry = directory.get(name);
    if (!entry || entry.size !== data.length || entry.crc !== crc32(data)) throw new Error(`MXL integrity check failed: ${name}`);
  }
  return files;
}
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; return value; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ value >>> 8; return (value ^ 0xffffffff) >>> 0; }
function zipDirectory(bytes, limits) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  if (end < 0) throw new Error('MXL archive is incomplete.');
  const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), offset = view.getUint32(end + 16, true);
  if (count > limits.maxEntries) throw new Error('Too many entries in the MXL archive.');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || count !== view.getUint16(end + 8, true) || count > limits.maxEntries || offset + size !== end) throw new Error('Unsupported or oversized MXL archive directory.');
  const entries = new Map(); let cursor = offset, expanded = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid MXL archive directory.');
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true), length = view.getUint16(cursor + 28, true);
    const next = cursor + 46 + length + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    if (next > end || flags & 1 || ![0, 8].includes(method)) throw new Error('Encrypted or unsupported MXL compression.');
    const name = archivePath(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + length)));
    const originalSize = view.getUint32(cursor + 24, true); expanded += originalSize;
    if (expanded > limits.maxInflated) throw new Error('MXL decompression limit exceeded.');
    if (entries.has(name)) throw new Error(`Duplicate archive entry: ${name}`);
    entries.set(name, { size: originalSize, crc: view.getUint32(cursor + 16, true) }); cursor = next;
  }
  if (cursor !== end) throw new Error('Invalid MXL archive directory length.');
  return entries;
}
export function readMusicXML(bytes, format, limits = SCORE_LIMITS) {
  if (!(bytes instanceof Uint8Array) || bytes.length > limits.maxBytes) throw new Error('The score exceeds the 25 MB acquisition limit.');
  let xml, rootfile = null;
  const decode = data => new TextDecoder('utf-8', { fatal: true }).decode(data);
  if (format === 'mxl') {
    if (bytes[0] !== 80 || bytes[1] !== 75) throw new Error('The response is not an MXL ZIP archive.');
    const files = unpack(bytes, limits), container = files.get('META-INF/container.xml');
    if (!container) throw new Error('MXL is missing META-INF/container.xml.');
    const doc = xmlDocument(decode(container));
    if (doc.documentElement.localName !== 'container') throw new Error('Invalid MXL container.');
    const roots = children(child(doc.documentElement, 'rootfiles'), 'rootfile');
    const selected = roots.find(n => n.getAttribute('media-type') === 'application/vnd.recordare.musicxml+xml') || (roots[0] && !roots[0].hasAttribute('media-type') ? roots[0] : null);
    if (!selected) throw new Error('MXL has no MusicXML rootfile.');
    rootfile = archivePath(selected.getAttribute('full-path'));
    if (!files.has(rootfile)) throw new Error('The declared MXL rootfile is missing.');
    xml = decode(files.get(rootfile));
  } else if (format === 'musicxml') xml = decode(bytes);
  else throw new Error(`Unsupported score format: ${format}`);
  const document = xmlDocument(xml), root = document.documentElement;
  if (root.localName === 'score-timewise') throw new Error('Timewise MusicXML requires a reviewed partwise conversion.');
  if (root.localName !== 'score-partwise') throw new Error('The response is not a partwise MusicXML score.');
  if (!child(root, 'part-list') || !children(root, 'part').length) throw new Error('MusicXML has no part list or music.');
  if (root.getElementsByTagName('note').length > limits.maxNotes) throw new Error('The score exceeds the note limit.');
  if (root.getElementsByTagName('measure').length > limits.maxMeasures) throw new Error('The score exceeds the measure limit.');
  return { xml: serializeXML(document), document, rootfile };
}
export const bytesFromBase64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export function bytesToBase64(bytes) {
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
