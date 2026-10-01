// Three-way merging uses the last shared snapshot, never device clocks.
export function stableJSON(value) {
  return JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

export function notebookContent(backup) {
  const value = structuredClone(backup);
  delete value.exportedAt;
  delete value.cloudBackup;
  return value;
}

export function mergeNotebooks(base, local, remote, preference = null) {
  const conflicts = [];
  const equal = (a, b) => stableJSON(a) === stableJSON(b);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function merge(b, l, r, path) {
    if (equal(l, r)) return l;
    if (base && equal(l, b)) return r;
    if (base && equal(r, b)) return l;
    // On first connection, absent records are additions, not deletions.
    if (!base || b === undefined) {
      if (l === undefined) return r;
      if (r === undefined) return l;
    }
    const atomic = /\/(marks\/[^/]+|executions\/[^/]+|active|scoreView)$/.test(path);
    if (!atomic && object(l) && object(r) && (b === undefined || object(b))) {
      const result = {};
      for (const key of new Set([...Object.keys(b || {}), ...Object.keys(l), ...Object.keys(r)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        const value = merge(b?.[key], l[key], r[key], `${path}/${key}`);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    if (!atomic && Array.isArray(l) && Array.isArray(r) && (b === undefined || Array.isArray(b))) {
      const all = [...(b || []), ...l, ...r];
      const key = ['id', 'catalogId'].find(k => all.length && all.every(v => object(v) && typeof v[k] === 'string'));
      if (key && [b || [], l, r].every(items => new Set(items.map(v => v[key])).size === items.length)) {
        const map = items => Object.fromEntries((items || []).map(v => [v[key], v]));
        return Object.values(merge(map(b), map(l), map(r), path));
      }
    }
    conflicts.push(path);
    return preference === 'remote' ? r : l;
  }
  return { backup: merge(base ? notebookContent(base) : undefined, notebookContent(local), notebookContent(remote), ''), conflicts };
}

