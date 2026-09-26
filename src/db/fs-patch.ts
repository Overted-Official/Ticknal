import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';

/**
 * Next.js Turbopack / Webpack Bundler Cross-Realm URL Shim for Node.js
 * 
 * In Node.js 22/24, internal fs methods call `validatePath(path)`.
 * It checks `path instanceof URL`. When packages like `@electric-sql/pglite` or
 * emscripten wasm loaders create `new URL('postgres.wasm', import.meta.url)`
 * within a Turbopack/Next.js bundled realm, `instanceof URL` returns false in Node's
 * native realm, throwing `TypeError: The "path" argument must be of type string or an instance of Buffer or URL. Received an instance of URL`.
 * 
 * Converting any `file://` URL-like object to a file path string completely bypasses
 * the cross-realm `instanceof URL` check.
 */
function sanitizePath(p: any): any {
  if (p && typeof p === 'object' && typeof p.href === 'string' && p.href.startsWith('file:')) {
    try {
      return fileURLToPath(p.href);
    } catch {
      return p;
    }
  }
  return p;
}

if (!(globalThis as any).__ticknal_fs_patched__) {
  (globalThis as any).__ticknal_fs_patched__ = true;

  const anyFs = fs as any;
  const anyFsPromises = fsPromises as any;

  const origReadFileSync = anyFs.readFileSync;
  anyFs.readFileSync = function (pathArg: any, options?: any) {
    return origReadFileSync.call(fs, sanitizePath(pathArg), options);
  };

  const origReadFile = anyFs.readFile;
  anyFs.readFile = function (pathArg: any, ...args: any[]) {
    return origReadFile.call(fs, sanitizePath(pathArg), ...args);
  };

  const origPromisesReadFile = anyFsPromises.readFile;
  anyFsPromises.readFile = function (pathArg: any, options?: any) {
    return origPromisesReadFile.call(fsPromises, sanitizePath(pathArg), options);
  };

  const origStatSync = anyFs.statSync;
  anyFs.statSync = function (pathArg: any, options?: any) {
    return origStatSync.call(fs, sanitizePath(pathArg), options);
  };

  const origStat = anyFs.stat;
  anyFs.stat = function (pathArg: any, ...args: any[]) {
    return origStat.call(fs, sanitizePath(pathArg), ...args);
  };

  const origPromisesStat = anyFsPromises.stat;
  anyFsPromises.stat = function (pathArg: any, options?: any) {
    return origPromisesStat.call(fsPromises, sanitizePath(pathArg), options);
  };

  const origOpenSync = anyFs.openSync;
  anyFs.openSync = function (pathArg: any, flags?: any, mode?: any) {
    return origOpenSync.call(fs, sanitizePath(pathArg), flags, mode);
  };

  const origPromisesOpen = anyFsPromises.open;
  anyFsPromises.open = function (pathArg: any, flags?: any, mode?: any) {
    return origPromisesOpen.call(fsPromises, sanitizePath(pathArg), flags, mode);
  };
}
