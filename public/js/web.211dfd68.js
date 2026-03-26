// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../../node_modules/@capacitor/filesystem/dist/esm/web.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilesystemWeb = void 0;
var _core = require("@capacitor/core");
var _definitions = require("./definitions");
function resolve(path) {
  const posix = path.split('/').filter(item => item !== '.');
  const newPosix = [];
  posix.forEach(item => {
    if (item === '..' && newPosix.length > 0 && newPosix[newPosix.length - 1] !== '..') {
      newPosix.pop();
    } else {
      newPosix.push(item);
    }
  });
  return newPosix.join('/');
}
function isPathParent(parent, children) {
  parent = resolve(parent);
  children = resolve(children);
  const pathsA = parent.split('/');
  const pathsB = children.split('/');
  return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
}
class FilesystemWeb extends _core.WebPlugin {
  constructor() {
    super(...arguments);
    this.DB_VERSION = 1;
    this.DB_NAME = 'Disc';
    this._writeCmds = ['add', 'put', 'delete'];
    /**
     * Function that performs a http request to a server and downloads the file to the specified destination
     *
     * @deprecated Use the @capacitor/file-transfer plugin instead.
     * @param options the options for the download operation
     * @returns a promise that resolves with the download file result
     */
    this.downloadFile = async options => {
      var _a, _b;
      const requestInit = (0, _core.buildRequestInit)(options, options.webFetchExtra);
      const response = await fetch(options.url, requestInit);
      let blob;
      if (!options.progress) blob = await response.blob();else if (!(response === null || response === void 0 ? void 0 : response.body)) blob = new Blob();else {
        const reader = response.body.getReader();
        let bytes = 0;
        const chunks = [];
        const contentType = response.headers.get('content-type');
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        while (true) {
          const {
            done,
            value
          } = await reader.read();
          if (done) break;
          chunks.push(value);
          bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
          const status = {
            url: options.url,
            bytes,
            contentLength
          };
          this.notifyListeners('progress', status);
        }
        const allChunks = new Uint8Array(bytes);
        let position = 0;
        for (const chunk of chunks) {
          if (typeof chunk === 'undefined') continue;
          allChunks.set(chunk, position);
          position += chunk.length;
        }
        blob = new Blob([allChunks.buffer], {
          type: contentType || undefined
        });
      }
      const result = await this.writeFile({
        path: options.path,
        directory: (_a = options.directory) !== null && _a !== void 0 ? _a : undefined,
        recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
        data: blob
      });
      return {
        path: result.uri,
        blob
      };
    };
  }
  readFileInChunks(_options, _callback) {
    throw this.unavailable('Method not implemented.');
  }
  async initDb() {
    if (this._db !== undefined) {
      return this._db;
    }
    if (!('indexedDB' in window)) {
      throw this.unavailable("This browser doesn't support IndexedDB");
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = FilesystemWeb.doUpgrade;
      request.onsuccess = () => {
        this._db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('db blocked');
      };
    });
  }
  static doUpgrade(event) {
    const eventTarget = event.target;
    const db = eventTarget.result;
    switch (event.oldVersion) {
      case 0:
      case 1:
      default:
        {
          if (db.objectStoreNames.contains('FileStorage')) {
            db.deleteObjectStore('FileStorage');
          }
          const store = db.createObjectStore('FileStorage', {
            keyPath: 'path'
          });
          store.createIndex('by_folder', 'folder');
        }
    }
  }
  async dbRequest(cmd, args) {
    const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? 'readwrite' : 'readonly';
    return this.initDb().then(conn => {
      return new Promise((resolve, reject) => {
        const tx = conn.transaction(['FileStorage'], readFlag);
        const store = tx.objectStore('FileStorage');
        const req = store[cmd](...args);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }
  async dbIndexRequest(indexName, cmd, args) {
    const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? 'readwrite' : 'readonly';
    return this.initDb().then(conn => {
      return new Promise((resolve, reject) => {
        const tx = conn.transaction(['FileStorage'], readFlag);
        const store = tx.objectStore('FileStorage');
        const index = store.index(indexName);
        const req = index[cmd](...args);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }
  getPath(directory, uriPath) {
    const cleanedUriPath = uriPath !== undefined ? uriPath.replace(/^[/]+|[/]+$/g, '') : '';
    let fsPath = '';
    if (directory !== undefined) fsPath += '/' + directory;
    if (uriPath !== '') fsPath += '/' + cleanedUriPath;
    return fsPath;
  }
  async clear() {
    const conn = await this.initDb();
    const tx = conn.transaction(['FileStorage'], 'readwrite');
    const store = tx.objectStore('FileStorage');
    store.clear();
  }
  /**
   * Read a file from disk
   * @param options options for the file read
   * @return a promise that resolves with the read file data result
   */
  async readFile(options) {
    const path = this.getPath(options.directory, options.path);
    // const encoding = options.encoding;
    const entry = await this.dbRequest('get', [path]);
    if (entry === undefined) throw Error('File does not exist.');
    return {
      data: entry.content ? entry.content : ''
    };
  }
  /**
   * Write a file to disk in the specified location on device
   * @param options options for the file write
   * @return a promise that resolves with the file write result
   */
  async writeFile(options) {
    const path = this.getPath(options.directory, options.path);
    let data = options.data;
    const encoding = options.encoding;
    const doRecursive = options.recursive;
    const occupiedEntry = await this.dbRequest('get', [path]);
    if (occupiedEntry && occupiedEntry.type === 'directory') throw Error('The supplied path is a directory.');
    const parentPath = path.substr(0, path.lastIndexOf('/'));
    const parentEntry = await this.dbRequest('get', [parentPath]);
    if (parentEntry === undefined) {
      const subDirIndex = parentPath.indexOf('/', 1);
      if (subDirIndex !== -1) {
        const parentArgPath = parentPath.substr(subDirIndex);
        await this.mkdir({
          path: parentArgPath,
          directory: options.directory,
          recursive: doRecursive
        });
      }
    }
    if (!encoding && !(data instanceof Blob)) {
      data = data.indexOf(',') >= 0 ? data.split(',')[1] : data;
      if (!this.isBase64String(data)) throw Error('The supplied data is not valid base64 content.');
    }
    const now = Date.now();
    const pathObj = {
      path: path,
      folder: parentPath,
      type: 'file',
      size: data instanceof Blob ? data.size : data.length,
      ctime: now,
      mtime: now,
      content: data
    };
    await this.dbRequest('put', [pathObj]);
    return {
      uri: pathObj.path
    };
  }
  /**
   * Append to a file on disk in the specified location on device
   * @param options options for the file append
   * @return a promise that resolves with the file write result
   */
  async appendFile(options) {
    const path = this.getPath(options.directory, options.path);
    let data = options.data;
    const encoding = options.encoding;
    const parentPath = path.substr(0, path.lastIndexOf('/'));
    const now = Date.now();
    let ctime = now;
    const occupiedEntry = await this.dbRequest('get', [path]);
    if (occupiedEntry && occupiedEntry.type === 'directory') throw Error('The supplied path is a directory.');
    const parentEntry = await this.dbRequest('get', [parentPath]);
    if (parentEntry === undefined) {
      const subDirIndex = parentPath.indexOf('/', 1);
      if (subDirIndex !== -1) {
        const parentArgPath = parentPath.substr(subDirIndex);
        await this.mkdir({
          path: parentArgPath,
          directory: options.directory,
          recursive: true
        });
      }
    }
    if (!encoding && !this.isBase64String(data)) throw Error('The supplied data is not valid base64 content.');
    if (occupiedEntry !== undefined) {
      if (occupiedEntry.content instanceof Blob) {
        throw Error('The occupied entry contains a Blob object which cannot be appended to.');
      }
      if (occupiedEntry.content !== undefined && !encoding) {
        data = btoa(atob(occupiedEntry.content) + atob(data));
      } else {
        data = occupiedEntry.content + data;
      }
      ctime = occupiedEntry.ctime;
    }
    const pathObj = {
      path: path,
      folder: parentPath,
      type: 'file',
      size: data.length,
      ctime: ctime,
      mtime: now,
      content: data
    };
    await this.dbRequest('put', [pathObj]);
  }
  /**
   * Delete a file from disk
   * @param options options for the file delete
   * @return a promise that resolves with the deleted file data result
   */
  async deleteFile(options) {
    const path = this.getPath(options.directory, options.path);
    const entry = await this.dbRequest('get', [path]);
    if (entry === undefined) throw Error('File does not exist.');
    const entries = await this.dbIndexRequest('by_folder', 'getAllKeys', [IDBKeyRange.only(path)]);
    if (entries.length !== 0) throw Error('Folder is not empty.');
    await this.dbRequest('delete', [path]);
  }
  /**
   * Create a directory.
   * @param options options for the mkdir
   * @return a promise that resolves with the mkdir result
   */
  async mkdir(options) {
    const path = this.getPath(options.directory, options.path);
    const doRecursive = options.recursive;
    const parentPath = path.substr(0, path.lastIndexOf('/'));
    const depth = (path.match(/\//g) || []).length;
    const parentEntry = await this.dbRequest('get', [parentPath]);
    const occupiedEntry = await this.dbRequest('get', [path]);
    if (depth === 1) throw Error('Cannot create Root directory');
    if (occupiedEntry !== undefined) throw Error('Current directory does already exist.');
    if (!doRecursive && depth !== 2 && parentEntry === undefined) throw Error('Parent directory must exist');
    if (doRecursive && depth !== 2 && parentEntry === undefined) {
      const parentArgPath = parentPath.substr(parentPath.indexOf('/', 1));
      await this.mkdir({
        path: parentArgPath,
        directory: options.directory,
        recursive: doRecursive
      });
    }
    const now = Date.now();
    const pathObj = {
      path: path,
      folder: parentPath,
      type: 'directory',
      size: 0,
      ctime: now,
      mtime: now
    };
    await this.dbRequest('put', [pathObj]);
  }
  /**
   * Remove a directory
   * @param options the options for the directory remove
   */
  async rmdir(options) {
    const {
      path,
      directory,
      recursive
    } = options;
    const fullPath = this.getPath(directory, path);
    const entry = await this.dbRequest('get', [fullPath]);
    if (entry === undefined) throw Error('Folder does not exist.');
    if (entry.type !== 'directory') throw Error('Requested path is not a directory');
    const readDirResult = await this.readdir({
      path,
      directory
    });
    if (readDirResult.files.length !== 0 && !recursive) throw Error('Folder is not empty');
    for (const entry of readDirResult.files) {
      const entryPath = `${path}/${entry.name}`;
      const entryObj = await this.stat({
        path: entryPath,
        directory
      });
      if (entryObj.type === 'file') {
        await this.deleteFile({
          path: entryPath,
          directory
        });
      } else {
        await this.rmdir({
          path: entryPath,
          directory,
          recursive
        });
      }
    }
    await this.dbRequest('delete', [fullPath]);
  }
  /**
   * Return a list of files from the directory (not recursive)
   * @param options the options for the readdir operation
   * @return a promise that resolves with the readdir directory listing result
   */
  async readdir(options) {
    const path = this.getPath(options.directory, options.path);
    const entry = await this.dbRequest('get', [path]);
    if (options.path !== '' && entry === undefined) throw Error('Folder does not exist.');
    const entries = await this.dbIndexRequest('by_folder', 'getAllKeys', [IDBKeyRange.only(path)]);
    const files = await Promise.all(entries.map(async e => {
      let subEntry = await this.dbRequest('get', [e]);
      if (subEntry === undefined) {
        subEntry = await this.dbRequest('get', [e + '/']);
      }
      return {
        name: e.substring(path.length + 1),
        type: subEntry.type,
        size: subEntry.size,
        ctime: subEntry.ctime,
        mtime: subEntry.mtime,
        uri: subEntry.path
      };
    }));
    return {
      files: files
    };
  }
  /**
   * Return full File URI for a path and directory
   * @param options the options for the stat operation
   * @return a promise that resolves with the file stat result
   */
  async getUri(options) {
    const path = this.getPath(options.directory, options.path);
    let entry = await this.dbRequest('get', [path]);
    if (entry === undefined) {
      entry = await this.dbRequest('get', [path + '/']);
    }
    return {
      uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path
    };
  }
  /**
   * Return data about a file
   * @param options the options for the stat operation
   * @return a promise that resolves with the file stat result
   */
  async stat(options) {
    const path = this.getPath(options.directory, options.path);
    let entry = await this.dbRequest('get', [path]);
    if (entry === undefined) {
      entry = await this.dbRequest('get', [path + '/']);
    }
    if (entry === undefined) throw Error('Entry does not exist.');
    return {
      name: entry.path.substring(path.length + 1),
      type: entry.type,
      size: entry.size,
      ctime: entry.ctime,
      mtime: entry.mtime,
      uri: entry.path
    };
  }
  /**
   * Rename a file or directory
   * @param options the options for the rename operation
   * @return a promise that resolves with the rename result
   */
  async rename(options) {
    await this._copy(options, true);
    return;
  }
  /**
   * Copy a file or directory
   * @param options the options for the copy operation
   * @return a promise that resolves with the copy result
   */
  async copy(options) {
    return this._copy(options, false);
  }
  async requestPermissions() {
    return {
      publicStorage: 'granted'
    };
  }
  async checkPermissions() {
    return {
      publicStorage: 'granted'
    };
  }
  /**
   * Function that can perform a copy or a rename
   * @param options the options for the rename operation
   * @param doRename whether to perform a rename or copy operation
   * @return a promise that resolves with the result
   */
  async _copy(options, doRename = false) {
    let {
      toDirectory
    } = options;
    const {
      to,
      from,
      directory: fromDirectory
    } = options;
    if (!to || !from) {
      throw Error('Both to and from must be provided');
    }
    // If no "to" directory is provided, use the "from" directory
    if (!toDirectory) {
      toDirectory = fromDirectory;
    }
    const fromPath = this.getPath(fromDirectory, from);
    const toPath = this.getPath(toDirectory, to);
    // Test that the "to" and "from" locations are different
    if (fromPath === toPath) {
      return {
        uri: toPath
      };
    }
    if (isPathParent(fromPath, toPath)) {
      throw Error('To path cannot contain the from path');
    }
    // Check the state of the "to" location
    let toObj;
    try {
      toObj = await this.stat({
        path: to,
        directory: toDirectory
      });
    } catch (e) {
      // To location does not exist, ensure the directory containing "to" location exists and is a directory
      const toPathComponents = to.split('/');
      toPathComponents.pop();
      const toPath = toPathComponents.join('/');
      // Check the containing directory of the "to" location exists
      if (toPathComponents.length > 0) {
        const toParentDirectory = await this.stat({
          path: toPath,
          directory: toDirectory
        });
        if (toParentDirectory.type !== 'directory') {
          throw new Error('Parent directory of the to path is a file');
        }
      }
    }
    // Cannot overwrite a directory
    if (toObj && toObj.type === 'directory') {
      throw new Error('Cannot overwrite a directory with a file');
    }
    // Ensure the "from" object exists
    const fromObj = await this.stat({
      path: from,
      directory: fromDirectory
    });
    // Set the mtime/ctime of the supplied path
    const updateTime = async (path, ctime, mtime) => {
      const fullPath = this.getPath(toDirectory, path);
      const entry = await this.dbRequest('get', [fullPath]);
      entry.ctime = ctime;
      entry.mtime = mtime;
      await this.dbRequest('put', [entry]);
    };
    const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
    switch (fromObj.type) {
      // The "from" object is a file
      case 'file':
        {
          // Read the file
          const file = await this.readFile({
            path: from,
            directory: fromDirectory
          });
          // Optionally remove the file
          if (doRename) {
            await this.deleteFile({
              path: from,
              directory: fromDirectory
            });
          }
          let encoding;
          if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) {
            encoding = _definitions.Encoding.UTF8;
          }
          // Write the file to the new location
          const writeResult = await this.writeFile({
            path: to,
            directory: toDirectory,
            data: file.data,
            encoding: encoding
          });
          // Copy the mtime/ctime of a renamed file
          if (doRename) {
            await updateTime(to, ctime, fromObj.mtime);
          }
          // Resolve promise
          return writeResult;
        }
      case 'directory':
        {
          if (toObj) {
            throw Error('Cannot move a directory over an existing object');
          }
          try {
            // Create the to directory
            await this.mkdir({
              path: to,
              directory: toDirectory,
              recursive: false
            });
            // Copy the mtime/ctime of a renamed directory
            if (doRename) {
              await updateTime(to, ctime, fromObj.mtime);
            }
          } catch (e) {
            // ignore
          }
          // Iterate over the contents of the from location
          const contents = (await this.readdir({
            path: from,
            directory: fromDirectory
          })).files;
          for (const filename of contents) {
            // Move item from the from directory to the to directory
            await this._copy({
              from: `${from}/${filename.name}`,
              to: `${to}/${filename.name}`,
              directory: fromDirectory,
              toDirectory
            }, doRename);
          }
          // Optionally remove the original from directory
          if (doRename) {
            await this.rmdir({
              path: from,
              directory: fromDirectory
            });
          }
        }
    }
    return {
      uri: toPath
    };
  }
  isBase64String(str) {
    try {
      return btoa(atob(str)) == str;
    } catch (err) {
      return false;
    }
  }
}
exports.FilesystemWeb = FilesystemWeb;
FilesystemWeb._debug = true;
},{"@capacitor/core":"../../node_modules/@capacitor/core/dist/index.js","./definitions":"../../node_modules/@capacitor/filesystem/dist/esm/definitions.js"}],"../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;
function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}
module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;
if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "50088" + '/');
  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);
    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);
          if (didAccept) {
            handled = true;
          }
        }
      });

      // Enable HMR for CSS by default.
      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });
      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }
    if (data.type === 'reload') {
      ws.close();
      ws.onclose = function () {
        location.reload();
      };
    }
    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }
    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}
function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
}
function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;

  // html encode message and stack trace
  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}
function getParents(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return [];
  }
  var parents = [];
  var k, d, dep;
  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];
      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }
  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }
  return parents;
}
function hmrApply(bundle, asset) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}
function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;
  if (!modules) {
    return;
  }
  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }
  if (checkedAssets[id]) {
    return;
  }
  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }
  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}
function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};
  if (cached) {
    cached.hot.data = bundle.hotData;
  }
  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }
  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];
  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });
    return true;
  }
}
},{}]},{},["../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js"], null)
//# sourceMappingURL=/web.211dfd68.js.map