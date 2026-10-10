// Raises the Android versionCode by one and sets the public version everywhere it is declared.
// Usage: node scripts/store/bump-version.mjs [patch|minor|major|x.y.z]   (default: patch)
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const GRADLE = 'android/app/build.gradle';
const gradle = await readFile(GRADLE, 'utf8');
const code = Number(gradle.match(/versionCode\s+(\d+)/)?.[1]);
const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
if (!code || !name) throw new Error(`versionCode/versionName not found in ${GRADLE}`);

const arg = process.argv[2] ?? 'patch';
let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg;
else {
  const [major, minor, patch] = name.split('.').map(Number);
  next = { major: `${major + 1}.0.0`, minor: `${major}.${minor + 1}.0`, patch: `${major}.${minor}.${patch + 1}` }[arg];
  if (!next) throw new Error(`Unknown bump "${arg}": use patch, minor, major or x.y.z`);
}

await writeFile(GRADLE, gradle
  .replace(/versionCode\s+\d+/, `versionCode ${code + 1}`)
  .replace(/versionName\s+"[^"]+"/, `versionName "${next}"`));
// package.json and package-lock.json keep the same public version as the app.
execSync(`npm version ${next} --no-git-tag-version --allow-same-version`, { stdio: 'ignore', shell: true });

console.log(`versionCode ${code} -> ${code + 1}`);
console.log(`versionName ${name} -> ${next}`);
console.log(`Bundle will be SPino-${next}-${code + 1}.aab`);
