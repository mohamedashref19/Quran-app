// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles

(function (
  modules,
  entry,
  mainEntry,
  parcelRequireName,
  externals,
  distDir,
  publicUrl,
  devServer
) {
  /* eslint-disable no-undef */
  var globalObject =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
      ? self
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {};
  /* eslint-enable no-undef */

  // Save the require from previous bundle to this closure if any
  var previousRequire =
    typeof globalObject[parcelRequireName] === 'function' &&
    globalObject[parcelRequireName];

  var importMap = previousRequire.i || {};
  var cache = previousRequire.cache || {};
  // Do not use `require` to prevent Webpack from trying to bundle this call
  var nodeRequire =
    typeof module !== 'undefined' &&
    typeof module.require === 'function' &&
    module.require.bind(module);

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        if (externals[name]) {
          return externals[name];
        }
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire =
          typeof globalObject[parcelRequireName] === 'function' &&
          globalObject[parcelRequireName];
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

        var err = new Error("Cannot find module '" + name + "'");
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = (cache[name] = new newRequire.Module(name));

      modules[name][0].call(
        module.exports,
        localRequire,
        module,
        module.exports,
        globalObject
      );
    }

    return cache[name].exports;

    function localRequire(x) {
      var res = localRequire.resolve(x);
      if (res === false) {
        return {};
      }
      // Synthesize a module to follow re-exports.
      if (Array.isArray(res)) {
        var m = {__esModule: true};
        res.forEach(function (v) {
          var key = v[0];
          var id = v[1];
          var exp = v[2] || v[0];
          var x = newRequire(id);
          if (key === '*') {
            Object.keys(x).forEach(function (key) {
              if (
                key === 'default' ||
                key === '__esModule' ||
                Object.prototype.hasOwnProperty.call(m, key)
              ) {
                return;
              }

              Object.defineProperty(m, key, {
                enumerable: true,
                get: function () {
                  return x[key];
                },
              });
            });
          } else if (exp === '*') {
            Object.defineProperty(m, key, {
              enumerable: true,
              value: x,
            });
          } else {
            Object.defineProperty(m, key, {
              enumerable: true,
              get: function () {
                if (exp === 'default') {
                  return x.__esModule ? x.default : x;
                }
                return x[exp];
              },
            });
          }
        });
        return m;
      }
      return newRequire(res);
    }

    function resolve(x) {
      var id = modules[name][1][x];
      return id != null ? id : x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.require = nodeRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.distDir = distDir;
  newRequire.publicUrl = publicUrl;
  newRequire.devServer = devServer;
  newRequire.i = importMap;
  newRequire.register = function (id, exports) {
    modules[id] = [
      function (require, module) {
        module.exports = exports;
      },
      {},
    ];
  };

  // Only insert newRequire.load when it is actually used.
  // The code in this file is linted against ES5, so dynamic import is not allowed.
  // INSERT_LOAD_HERE

  Object.defineProperty(newRequire, 'root', {
    get: function () {
      return globalObject[parcelRequireName];
    },
  });

  globalObject[parcelRequireName] = newRequire;

  for (var i = 0; i < entry.length; i++) {
    newRequire(entry[i]);
  }

  if (mainEntry) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(mainEntry);

    // CommonJS
    if (typeof exports === 'object' && typeof module !== 'undefined') {
      module.exports = mainExports;

      // RequireJS
    } else if (typeof define === 'function' && define.amd) {
      define(function () {
        return mainExports;
      });
    }
  }
})({"kqkBW":[function(require,module,exports,__globalThis) {
var global = arguments[3];
var HMR_HOST = null;
var HMR_PORT = 1234;
var HMR_SERVER_PORT = 1234;
var HMR_SECURE = false;
var HMR_ENV_HASH = "d6ea1d42532a7575";
var HMR_USE_SSE = false;
module.bundle.HMR_BUNDLE_ID = "2618d2f4f8269265";
"use strict";
/* global HMR_HOST, HMR_PORT, HMR_SERVER_PORT, HMR_ENV_HASH, HMR_SECURE, HMR_USE_SSE, chrome, browser, __parcel__import__, __parcel__importScripts__, ServiceWorkerGlobalScope */ /*::
import type {
  HMRAsset,
  HMRMessage,
} from '@parcel/reporter-dev-server/src/HMRServer.js';
interface ParcelRequire {
  (string): mixed;
  cache: {|[string]: ParcelModule|};
  hotData: {|[string]: mixed|};
  Module: any;
  parent: ?ParcelRequire;
  isParcelRequire: true;
  modules: {|[string]: [Function, {|[string]: string|}]|};
  HMR_BUNDLE_ID: string;
  root: ParcelRequire;
}
interface ParcelModule {
  hot: {|
    data: mixed,
    accept(cb: (Function) => void): void,
    dispose(cb: (mixed) => void): void,
    // accept(deps: Array<string> | string, cb: (Function) => void): void,
    // decline(): void,
    _acceptCallbacks: Array<(Function) => void>,
    _disposeCallbacks: Array<(mixed) => void>,
  |};
}
interface ExtensionContext {
  runtime: {|
    reload(): void,
    getURL(url: string): string;
    getManifest(): {manifest_version: number, ...};
  |};
}
declare var module: {bundle: ParcelRequire, ...};
declare var HMR_HOST: string;
declare var HMR_PORT: string;
declare var HMR_SERVER_PORT: string;
declare var HMR_ENV_HASH: string;
declare var HMR_SECURE: boolean;
declare var HMR_USE_SSE: boolean;
declare var chrome: ExtensionContext;
declare var browser: ExtensionContext;
declare var __parcel__import__: (string) => Promise<void>;
declare var __parcel__importScripts__: (string) => Promise<void>;
declare var globalThis: typeof self;
declare var ServiceWorkerGlobalScope: Object;
*/ var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;
function Module(moduleName) {
    OldModule.call(this, moduleName);
    this.hot = {
        data: module.bundle.hotData[moduleName],
        _acceptCallbacks: [],
        _disposeCallbacks: [],
        accept: function(fn) {
            this._acceptCallbacks.push(fn || function() {});
        },
        dispose: function(fn) {
            this._disposeCallbacks.push(fn);
        }
    };
    module.bundle.hotData[moduleName] = undefined;
}
module.bundle.Module = Module;
module.bundle.hotData = {};
var checkedAssets /*: {|[string]: boolean|} */ , disposedAssets /*: {|[string]: boolean|} */ , assetsToDispose /*: Array<[ParcelRequire, string]> */ , assetsToAccept /*: Array<[ParcelRequire, string]> */ , bundleNotFound = false;
function getHostname() {
    return HMR_HOST || (typeof location !== 'undefined' && location.protocol.indexOf('http') === 0 ? location.hostname : 'localhost');
}
function getPort() {
    return HMR_PORT || (typeof location !== 'undefined' ? location.port : HMR_SERVER_PORT);
}
// eslint-disable-next-line no-redeclare
let WebSocket = globalThis.WebSocket;
if (!WebSocket && typeof module.bundle.root === 'function') try {
    // eslint-disable-next-line no-global-assign
    WebSocket = module.bundle.root('ws');
} catch  {
// ignore.
}
var hostname = getHostname();
var port = getPort();
var protocol = HMR_SECURE || typeof location !== 'undefined' && location.protocol === 'https:' && ![
    'localhost',
    '127.0.0.1',
    '0.0.0.0'
].includes(hostname) ? 'wss' : 'ws';
// eslint-disable-next-line no-redeclare
var parent = module.bundle.parent;
if (!parent || !parent.isParcelRequire) {
    // Web extension context
    var extCtx = typeof browser === 'undefined' ? typeof chrome === 'undefined' ? null : chrome : browser;
    // Safari doesn't support sourceURL in error stacks.
    // eval may also be disabled via CSP, so do a quick check.
    var supportsSourceURL = false;
    try {
        (0, eval)('throw new Error("test"); //# sourceURL=test.js');
    } catch (err) {
        supportsSourceURL = err.stack.includes('test.js');
    }
    var ws;
    if (HMR_USE_SSE) ws = new EventSource('/__parcel_hmr');
    else try {
        // If we're running in the dev server's node runner, listen for messages on the parent port.
        let { workerData, parentPort } = module.bundle.root('node:worker_threads') /*: any*/ ;
        if (workerData !== null && workerData !== void 0 && workerData.__parcel) {
            parentPort.on('message', async (message)=>{
                try {
                    await handleMessage(message);
                    parentPort.postMessage('updated');
                } catch  {
                    parentPort.postMessage('restart');
                }
            });
            // After the bundle has finished running, notify the dev server that the HMR update is complete.
            queueMicrotask(()=>parentPort.postMessage('ready'));
        }
    } catch  {
        if (typeof WebSocket !== 'undefined') try {
            ws = new WebSocket(protocol + '://' + hostname + (port ? ':' + port : '') + '/');
        } catch (err) {
            // Ignore cloudflare workers error.
            if (err.message && !err.message.includes('Disallowed operation called within global scope')) console.error(err.message);
        }
    }
    if (ws) {
        // $FlowFixMe
        ws.onmessage = async function(event /*: {data: string, ...} */ ) {
            var data /*: HMRMessage */  = JSON.parse(event.data);
            await handleMessage(data);
        };
        if (ws instanceof WebSocket) {
            ws.onerror = function(e) {
                if (e.message) console.error(e.message);
            };
            ws.onclose = function() {
                console.warn("[parcel] \uD83D\uDEA8 Connection to the HMR server was lost");
            };
        }
    }
}
async function handleMessage(data /*: HMRMessage */ ) {
    checkedAssets = {} /*: {|[string]: boolean|} */ ;
    disposedAssets = {} /*: {|[string]: boolean|} */ ;
    assetsToAccept = [];
    assetsToDispose = [];
    bundleNotFound = false;
    if (data.type === 'reload') fullReload();
    else if (data.type === 'update') {
        // Remove error overlay if there is one
        if (typeof document !== 'undefined') removeErrorOverlay();
        let assets = data.assets;
        // Handle HMR Update
        let handled = assets.every((asset)=>{
            return asset.type === 'css' || asset.type === 'js' && hmrAcceptCheck(module.bundle.root, asset.id, asset.depsByBundle);
        });
        // Dispatch a custom event in case a bundle was not found. This might mean
        // an asset on the server changed and we should reload the page. This event
        // gives the client an opportunity to refresh without losing state
        // (e.g. via React Server Components). If e.preventDefault() is not called,
        // we will trigger a full page reload.
        if (handled && bundleNotFound && assets.some((a)=>a.envHash !== HMR_ENV_HASH) && typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') handled = !window.dispatchEvent(new CustomEvent('parcelhmrreload', {
            cancelable: true
        }));
        if (handled) {
            console.clear();
            // Dispatch custom event so other runtimes (e.g React Refresh) are aware.
            if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') window.dispatchEvent(new CustomEvent('parcelhmraccept'));
            await hmrApplyUpdates(assets);
            hmrDisposeQueue();
            // Run accept callbacks. This will also re-execute other disposed assets in topological order.
            let processedAssets = {};
            for(let i = 0; i < assetsToAccept.length; i++){
                let id = assetsToAccept[i][1];
                if (!processedAssets[id]) {
                    hmrAccept(assetsToAccept[i][0], id);
                    processedAssets[id] = true;
                }
            }
        } else fullReload();
    }
    if (data.type === 'error') {
        // Log parcel errors to console
        for (let ansiDiagnostic of data.diagnostics.ansi){
            let stack = ansiDiagnostic.codeframe ? ansiDiagnostic.codeframe : ansiDiagnostic.stack;
            console.error("\uD83D\uDEA8 [parcel]: " + ansiDiagnostic.message + '\n' + stack + '\n\n' + ansiDiagnostic.hints.join('\n'));
        }
        if (typeof document !== 'undefined') {
            // Render the fancy html overlay
            removeErrorOverlay();
            var overlay = createErrorOverlay(data.diagnostics.html);
            // $FlowFixMe
            document.body.appendChild(overlay);
        }
    }
}
function removeErrorOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        overlay.remove();
        console.log("[parcel] \u2728 Error resolved");
    }
}
function createErrorOverlay(diagnostics) {
    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    let errorHTML = '<div style="background: black; opacity: 0.85; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; font-family: Menlo, Consolas, monospace; z-index: 9999;">';
    for (let diagnostic of diagnostics){
        let stack = diagnostic.frames.length ? diagnostic.frames.reduce((p, frame)=>{
            return `${p}
<a href="${protocol === 'wss' ? 'https' : 'http'}://${hostname}:${port}/__parcel_launch_editor?file=${encodeURIComponent(frame.location)}" style="text-decoration: underline; color: #888" onclick="fetch(this.href); return false">${frame.location}</a>
${frame.code}`;
        }, '') : diagnostic.stack;
        errorHTML += `
      <div>
        <div style="font-size: 18px; font-weight: bold; margin-top: 20px;">
          \u{1F6A8} ${diagnostic.message}
        </div>
        <pre>${stack}</pre>
        <div>
          ${diagnostic.hints.map((hint)=>"<div>\uD83D\uDCA1 " + hint + '</div>').join('')}
        </div>
        ${diagnostic.documentation ? `<div>\u{1F4DD} <a style="color: violet" href="${diagnostic.documentation}" target="_blank">Learn more</a></div>` : ''}
      </div>
    `;
    }
    errorHTML += '</div>';
    overlay.innerHTML = errorHTML;
    return overlay;
}
function fullReload() {
    if (typeof location !== 'undefined' && 'reload' in location) location.reload();
    else if (typeof extCtx !== 'undefined' && extCtx && extCtx.runtime && extCtx.runtime.reload) extCtx.runtime.reload();
    else try {
        let { workerData, parentPort } = module.bundle.root('node:worker_threads') /*: any*/ ;
        if (workerData !== null && workerData !== void 0 && workerData.__parcel) parentPort.postMessage('restart');
    } catch (err) {
        console.error("[parcel] \u26A0\uFE0F An HMR update was not accepted. Please restart the process.");
    }
}
function getParents(bundle, id) /*: Array<[ParcelRequire, string]> */ {
    var modules = bundle.modules;
    if (!modules) return [];
    var parents = [];
    var k, d, dep;
    for(k in modules)for(d in modules[k][1]){
        dep = modules[k][1][d];
        if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) parents.push([
            bundle,
            k
        ]);
    }
    if (bundle.parent) parents = parents.concat(getParents(bundle.parent, id));
    return parents;
}
function updateLink(link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var newLink = link.cloneNode();
    newLink.onload = function() {
        if (link.parentNode !== null) // $FlowFixMe
        link.parentNode.removeChild(link);
    };
    newLink.setAttribute('href', // $FlowFixMe
    href.split('?')[0] + '?' + Date.now());
    // $FlowFixMe
    link.parentNode.insertBefore(newLink, link.nextSibling);
}
var cssTimeout = null;
function reloadCSS() {
    if (cssTimeout || typeof document === 'undefined') return;
    cssTimeout = setTimeout(function() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        for(var i = 0; i < links.length; i++){
            // $FlowFixMe[incompatible-type]
            var href /*: string */  = links[i].getAttribute('href');
            var hostname = getHostname();
            var servedFromHMRServer = hostname === 'localhost' ? new RegExp('^(https?:\\/\\/(0.0.0.0|127.0.0.1)|localhost):' + getPort()).test(href) : href.indexOf(hostname + ':' + getPort());
            var absolute = /^https?:\/\//i.test(href) && href.indexOf(location.origin) !== 0 && !servedFromHMRServer;
            if (!absolute) updateLink(links[i]);
        }
        cssTimeout = null;
    }, 50);
}
function hmrDownload(asset) {
    if (asset.type === 'js') {
        if (typeof document !== 'undefined') {
            let script = document.createElement('script');
            script.src = asset.url + '?t=' + Date.now();
            if (asset.outputFormat === 'esmodule') script.type = 'module';
            return new Promise((resolve, reject)=>{
                var _document$head;
                script.onload = ()=>resolve(script);
                script.onerror = reject;
                (_document$head = document.head) === null || _document$head === void 0 || _document$head.appendChild(script);
            });
        } else if (typeof importScripts === 'function') {
            // Worker scripts
            if (asset.outputFormat === 'esmodule') return import(asset.url + '?t=' + Date.now());
            else return new Promise((resolve, reject)=>{
                try {
                    importScripts(asset.url + '?t=' + Date.now());
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        }
    }
}
async function hmrApplyUpdates(assets) {
    global.parcelHotUpdate = Object.create(null);
    let scriptsToRemove;
    try {
        // If sourceURL comments aren't supported in eval, we need to load
        // the update from the dev server over HTTP so that stack traces
        // are correct in errors/logs. This is much slower than eval, so
        // we only do it if needed (currently just Safari).
        // https://bugs.webkit.org/show_bug.cgi?id=137297
        // This path is also taken if a CSP disallows eval.
        if (!supportsSourceURL) {
            let promises = assets.map((asset)=>{
                var _hmrDownload;
                return (_hmrDownload = hmrDownload(asset)) === null || _hmrDownload === void 0 ? void 0 : _hmrDownload.catch((err)=>{
                    // Web extension fix
                    if (extCtx && extCtx.runtime && extCtx.runtime.getManifest().manifest_version == 3 && typeof ServiceWorkerGlobalScope != 'undefined' && global instanceof ServiceWorkerGlobalScope) {
                        extCtx.runtime.reload();
                        return;
                    }
                    throw err;
                });
            });
            scriptsToRemove = await Promise.all(promises);
        }
        assets.forEach(function(asset) {
            hmrApply(module.bundle.root, asset);
        });
    } finally{
        delete global.parcelHotUpdate;
        if (scriptsToRemove) scriptsToRemove.forEach((script)=>{
            if (script) {
                var _document$head2;
                (_document$head2 = document.head) === null || _document$head2 === void 0 || _document$head2.removeChild(script);
            }
        });
    }
}
function hmrApply(bundle /*: ParcelRequire */ , asset /*:  HMRAsset */ ) {
    var modules = bundle.modules;
    if (!modules) return;
    if (asset.type === 'css') reloadCSS();
    else if (asset.type === 'js') {
        let deps = asset.depsByBundle[bundle.HMR_BUNDLE_ID];
        if (deps) {
            if (modules[asset.id]) {
                // Remove dependencies that are removed and will become orphaned.
                // This is necessary so that if the asset is added back again, the cache is gone, and we prevent a full page reload.
                let oldDeps = modules[asset.id][1];
                for(let dep in oldDeps)if (!deps[dep] || deps[dep] !== oldDeps[dep]) {
                    let id = oldDeps[dep];
                    let parents = getParents(module.bundle.root, id);
                    if (parents.length === 1) hmrDelete(module.bundle.root, id);
                }
            }
            if (supportsSourceURL) // Global eval. We would use `new Function` here but browser
            // support for source maps is better with eval.
            (0, eval)(asset.output);
            // $FlowFixMe
            let fn = global.parcelHotUpdate[asset.id];
            modules[asset.id] = [
                fn,
                deps
            ];
        }
        // Always traverse to the parent bundle, even if we already replaced the asset in this bundle.
        // This is required in case modules are duplicated. We need to ensure all instances have the updated code.
        if (bundle.parent) hmrApply(bundle.parent, asset);
    }
}
function hmrDelete(bundle, id) {
    let modules = bundle.modules;
    if (!modules) return;
    if (modules[id]) {
        // Collect dependencies that will become orphaned when this module is deleted.
        let deps = modules[id][1];
        let orphans = [];
        for(let dep in deps){
            let parents = getParents(module.bundle.root, deps[dep]);
            if (parents.length === 1) orphans.push(deps[dep]);
        }
        // Delete the module. This must be done before deleting dependencies in case of circular dependencies.
        delete modules[id];
        delete bundle.cache[id];
        // Now delete the orphans.
        orphans.forEach((id)=>{
            hmrDelete(module.bundle.root, id);
        });
    } else if (bundle.parent) hmrDelete(bundle.parent, id);
}
function hmrAcceptCheck(bundle /*: ParcelRequire */ , id /*: string */ , depsByBundle /*: ?{ [string]: { [string]: string } }*/ ) {
    checkedAssets = {};
    if (hmrAcceptCheckOne(bundle, id, depsByBundle)) return true;
    // Traverse parents breadth first. All possible ancestries must accept the HMR update, or we'll reload.
    let parents = getParents(module.bundle.root, id);
    let accepted = false;
    while(parents.length > 0){
        let v = parents.shift();
        let a = hmrAcceptCheckOne(v[0], v[1], null);
        if (a) // If this parent accepts, stop traversing upward, but still consider siblings.
        accepted = true;
        else if (a !== null) {
            // Otherwise, queue the parents in the next level upward.
            let p = getParents(module.bundle.root, v[1]);
            if (p.length === 0) {
                // If there are no parents, then we've reached an entry without accepting. Reload.
                accepted = false;
                break;
            }
            parents.push(...p);
        }
    }
    return accepted;
}
function hmrAcceptCheckOne(bundle /*: ParcelRequire */ , id /*: string */ , depsByBundle /*: ?{ [string]: { [string]: string } }*/ ) {
    var modules = bundle.modules;
    if (!modules) return;
    if (depsByBundle && !depsByBundle[bundle.HMR_BUNDLE_ID]) {
        // If we reached the root bundle without finding where the asset should go,
        // there's nothing to do. Mark as "accepted" so we don't reload the page.
        if (!bundle.parent) {
            bundleNotFound = true;
            return true;
        }
        return hmrAcceptCheckOne(bundle.parent, id, depsByBundle);
    }
    if (checkedAssets[id]) return null;
    checkedAssets[id] = true;
    var cached = bundle.cache[id];
    if (!cached) return true;
    assetsToDispose.push([
        bundle,
        id
    ]);
    if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
        assetsToAccept.push([
            bundle,
            id
        ]);
        return true;
    }
    return false;
}
function hmrDisposeQueue() {
    // Dispose all old assets.
    for(let i = 0; i < assetsToDispose.length; i++){
        let id = assetsToDispose[i][1];
        if (!disposedAssets[id]) {
            hmrDispose(assetsToDispose[i][0], id);
            disposedAssets[id] = true;
        }
    }
    assetsToDispose = [];
}
function hmrDispose(bundle /*: ParcelRequire */ , id /*: string */ ) {
    var cached = bundle.cache[id];
    bundle.hotData[id] = {};
    if (cached && cached.hot) cached.hot.data = bundle.hotData[id];
    if (cached && cached.hot && cached.hot._disposeCallbacks.length) cached.hot._disposeCallbacks.forEach(function(cb) {
        cb(bundle.hotData[id]);
    });
    delete bundle.cache[id];
}
function hmrAccept(bundle /*: ParcelRequire */ , id /*: string */ ) {
    // Execute the module.
    bundle(id);
    // Run the accept callbacks in the new version of the module.
    var cached = bundle.cache[id];
    if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
        let assetsToAlsoAccept = [];
        cached.hot._acceptCallbacks.forEach(function(cb) {
            let additionalAssets = cb(function() {
                return getParents(module.bundle.root, id);
            });
            if (Array.isArray(additionalAssets) && additionalAssets.length) assetsToAlsoAccept.push(...additionalAssets);
        });
        if (assetsToAlsoAccept.length) {
            let handled = assetsToAlsoAccept.every(function(a) {
                return hmrAcceptCheck(a[0], a[1]);
            });
            if (!handled) return fullReload();
            hmrDisposeQueue();
        }
    }
}

},{}],"eBrbG":[function(require,module,exports,__globalThis) {
var parcelHelpers = require("@parcel/transformer-js/src/esmodule-helpers.js");
parcelHelpers.defineInteropFlag(exports);
parcelHelpers.export(exports, "FilesystemWeb", ()=>FilesystemWeb);
var _core = require("@capacitor/core");
var _definitions = require("./definitions");
function resolve(path) {
    const posix = path.split('/').filter((item)=>item !== '.');
    const newPosix = [];
    posix.forEach((item)=>{
        if (item === '..' && newPosix.length > 0 && newPosix[newPosix.length - 1] !== '..') newPosix.pop();
        else newPosix.push(item);
    });
    return newPosix.join('/');
}
function isPathParent(parent, children) {
    parent = resolve(parent);
    children = resolve(children);
    const pathsA = parent.split('/');
    const pathsB = children.split('/');
    return parent !== children && pathsA.every((value, index)=>value === pathsB[index]);
}
class FilesystemWeb extends (0, _core.WebPlugin) {
    constructor(){
        super(...arguments);
        this.DB_VERSION = 1;
        this.DB_NAME = 'Disc';
        this._writeCmds = [
            'add',
            'put',
            'delete'
        ];
        /**
         * Function that performs a http request to a server and downloads the file to the specified destination
         *
         * @deprecated Use the @capacitor/file-transfer plugin instead.
         * @param options the options for the download operation
         * @returns a promise that resolves with the download file result
         */ this.downloadFile = async (options)=>{
            var _a, _b;
            const requestInit = (0, _core.buildRequestInit)(options, options.webFetchExtra);
            const response = await fetch(options.url, requestInit);
            let blob;
            if (!options.progress) blob = await response.blob();
            else if (!(response === null || response === void 0 ? void 0 : response.body)) blob = new Blob();
            else {
                const reader = response.body.getReader();
                let bytes = 0;
                const chunks = [];
                const contentType = response.headers.get('content-type');
                const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
                while(true){
                    const { done, value } = await reader.read();
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
                for (const chunk of chunks){
                    if (typeof chunk === 'undefined') continue;
                    allChunks.set(chunk, position);
                    position += chunk.length;
                }
                blob = new Blob([
                    allChunks.buffer
                ], {
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
        if (this._db !== undefined) return this._db;
        if (!('indexedDB' in window)) throw this.unavailable("This browser doesn't support IndexedDB");
        return new Promise((resolve, reject)=>{
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = FilesystemWeb.doUpgrade;
            request.onsuccess = ()=>{
                this._db = request.result;
                resolve(request.result);
            };
            request.onerror = ()=>reject(request.error);
            request.onblocked = ()=>{
                console.warn('db blocked');
            };
        });
    }
    static doUpgrade(event) {
        const eventTarget = event.target;
        const db = eventTarget.result;
        event.oldVersion;
        {
            if (db.objectStoreNames.contains('FileStorage')) db.deleteObjectStore('FileStorage');
            const store = db.createObjectStore('FileStorage', {
                keyPath: 'path'
            });
            store.createIndex('by_folder', 'folder');
        }
    }
    async dbRequest(cmd, args) {
        const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? 'readwrite' : 'readonly';
        return this.initDb().then((conn)=>{
            return new Promise((resolve, reject)=>{
                const tx = conn.transaction([
                    'FileStorage'
                ], readFlag);
                const store = tx.objectStore('FileStorage');
                const req = store[cmd](...args);
                req.onsuccess = ()=>resolve(req.result);
                req.onerror = ()=>reject(req.error);
            });
        });
    }
    async dbIndexRequest(indexName, cmd, args) {
        const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? 'readwrite' : 'readonly';
        return this.initDb().then((conn)=>{
            return new Promise((resolve, reject)=>{
                const tx = conn.transaction([
                    'FileStorage'
                ], readFlag);
                const store = tx.objectStore('FileStorage');
                const index = store.index(indexName);
                const req = index[cmd](...args);
                req.onsuccess = ()=>resolve(req.result);
                req.onerror = ()=>reject(req.error);
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
        const tx = conn.transaction([
            'FileStorage'
        ], 'readwrite');
        const store = tx.objectStore('FileStorage');
        store.clear();
    }
    /**
     * Read a file from disk
     * @param options options for the file read
     * @return a promise that resolves with the read file data result
     */ async readFile(options) {
        const path = this.getPath(options.directory, options.path);
        // const encoding = options.encoding;
        const entry = await this.dbRequest('get', [
            path
        ]);
        if (entry === undefined) throw Error('File does not exist.');
        return {
            data: entry.content ? entry.content : ''
        };
    }
    /**
     * Write a file to disk in the specified location on device
     * @param options options for the file write
     * @return a promise that resolves with the file write result
     */ async writeFile(options) {
        const path = this.getPath(options.directory, options.path);
        let data = options.data;
        const encoding = options.encoding;
        const doRecursive = options.recursive;
        const occupiedEntry = await this.dbRequest('get', [
            path
        ]);
        if (occupiedEntry && occupiedEntry.type === 'directory') throw Error('The supplied path is a directory.');
        const parentPath = path.substr(0, path.lastIndexOf('/'));
        const parentEntry = await this.dbRequest('get', [
            parentPath
        ]);
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
        await this.dbRequest('put', [
            pathObj
        ]);
        return {
            uri: pathObj.path
        };
    }
    /**
     * Append to a file on disk in the specified location on device
     * @param options options for the file append
     * @return a promise that resolves with the file write result
     */ async appendFile(options) {
        const path = this.getPath(options.directory, options.path);
        let data = options.data;
        const encoding = options.encoding;
        const parentPath = path.substr(0, path.lastIndexOf('/'));
        const now = Date.now();
        let ctime = now;
        const occupiedEntry = await this.dbRequest('get', [
            path
        ]);
        if (occupiedEntry && occupiedEntry.type === 'directory') throw Error('The supplied path is a directory.');
        const parentEntry = await this.dbRequest('get', [
            parentPath
        ]);
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
            if (occupiedEntry.content instanceof Blob) throw Error('The occupied entry contains a Blob object which cannot be appended to.');
            if (occupiedEntry.content !== undefined && !encoding) data = btoa(atob(occupiedEntry.content) + atob(data));
            else data = occupiedEntry.content + data;
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
        await this.dbRequest('put', [
            pathObj
        ]);
    }
    /**
     * Delete a file from disk
     * @param options options for the file delete
     * @return a promise that resolves with the deleted file data result
     */ async deleteFile(options) {
        const path = this.getPath(options.directory, options.path);
        const entry = await this.dbRequest('get', [
            path
        ]);
        if (entry === undefined) throw Error('File does not exist.');
        const entries = await this.dbIndexRequest('by_folder', 'getAllKeys', [
            IDBKeyRange.only(path)
        ]);
        if (entries.length !== 0) throw Error('Folder is not empty.');
        await this.dbRequest('delete', [
            path
        ]);
    }
    /**
     * Create a directory.
     * @param options options for the mkdir
     * @return a promise that resolves with the mkdir result
     */ async mkdir(options) {
        const path = this.getPath(options.directory, options.path);
        const doRecursive = options.recursive;
        const parentPath = path.substr(0, path.lastIndexOf('/'));
        const depth = (path.match(/\//g) || []).length;
        const parentEntry = await this.dbRequest('get', [
            parentPath
        ]);
        const occupiedEntry = await this.dbRequest('get', [
            path
        ]);
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
        await this.dbRequest('put', [
            pathObj
        ]);
    }
    /**
     * Remove a directory
     * @param options the options for the directory remove
     */ async rmdir(options) {
        const { path, directory, recursive } = options;
        const fullPath = this.getPath(directory, path);
        const entry = await this.dbRequest('get', [
            fullPath
        ]);
        if (entry === undefined) throw Error('Folder does not exist.');
        if (entry.type !== 'directory') throw Error('Requested path is not a directory');
        const readDirResult = await this.readdir({
            path,
            directory
        });
        if (readDirResult.files.length !== 0 && !recursive) throw Error('Folder is not empty');
        for (const entry of readDirResult.files){
            const entryPath = `${path}/${entry.name}`;
            const entryObj = await this.stat({
                path: entryPath,
                directory
            });
            if (entryObj.type === 'file') await this.deleteFile({
                path: entryPath,
                directory
            });
            else await this.rmdir({
                path: entryPath,
                directory,
                recursive
            });
        }
        await this.dbRequest('delete', [
            fullPath
        ]);
    }
    /**
     * Return a list of files from the directory (not recursive)
     * @param options the options for the readdir operation
     * @return a promise that resolves with the readdir directory listing result
     */ async readdir(options) {
        const path = this.getPath(options.directory, options.path);
        const entry = await this.dbRequest('get', [
            path
        ]);
        if (options.path !== '' && entry === undefined) throw Error('Folder does not exist.');
        const entries = await this.dbIndexRequest('by_folder', 'getAllKeys', [
            IDBKeyRange.only(path)
        ]);
        const files = await Promise.all(entries.map(async (e)=>{
            let subEntry = await this.dbRequest('get', [
                e
            ]);
            if (subEntry === undefined) subEntry = await this.dbRequest('get', [
                e + '/'
            ]);
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
     */ async getUri(options) {
        const path = this.getPath(options.directory, options.path);
        let entry = await this.dbRequest('get', [
            path
        ]);
        if (entry === undefined) entry = await this.dbRequest('get', [
            path + '/'
        ]);
        return {
            uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path
        };
    }
    /**
     * Return data about a file
     * @param options the options for the stat operation
     * @return a promise that resolves with the file stat result
     */ async stat(options) {
        const path = this.getPath(options.directory, options.path);
        let entry = await this.dbRequest('get', [
            path
        ]);
        if (entry === undefined) entry = await this.dbRequest('get', [
            path + '/'
        ]);
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
     */ async rename(options) {
        await this._copy(options, true);
        return;
    }
    /**
     * Copy a file or directory
     * @param options the options for the copy operation
     * @return a promise that resolves with the copy result
     */ async copy(options) {
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
     */ async _copy(options, doRename = false) {
        let { toDirectory } = options;
        const { to, from, directory: fromDirectory } = options;
        if (!to || !from) throw Error('Both to and from must be provided');
        // If no "to" directory is provided, use the "from" directory
        if (!toDirectory) toDirectory = fromDirectory;
        const fromPath = this.getPath(fromDirectory, from);
        const toPath = this.getPath(toDirectory, to);
        // Test that the "to" and "from" locations are different
        if (fromPath === toPath) return {
            uri: toPath
        };
        if (isPathParent(fromPath, toPath)) throw Error('To path cannot contain the from path');
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
                if (toParentDirectory.type !== 'directory') throw new Error('Parent directory of the to path is a file');
            }
        }
        // Cannot overwrite a directory
        if (toObj && toObj.type === 'directory') throw new Error('Cannot overwrite a directory with a file');
        // Ensure the "from" object exists
        const fromObj = await this.stat({
            path: from,
            directory: fromDirectory
        });
        // Set the mtime/ctime of the supplied path
        const updateTime = async (path, ctime, mtime)=>{
            const fullPath = this.getPath(toDirectory, path);
            const entry = await this.dbRequest('get', [
                fullPath
            ]);
            entry.ctime = ctime;
            entry.mtime = mtime;
            await this.dbRequest('put', [
                entry
            ]);
        };
        const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
        switch(fromObj.type){
            // The "from" object is a file
            case 'file':
                {
                    // Read the file
                    const file = await this.readFile({
                        path: from,
                        directory: fromDirectory
                    });
                    // Optionally remove the file
                    if (doRename) await this.deleteFile({
                        path: from,
                        directory: fromDirectory
                    });
                    let encoding;
                    if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) encoding = (0, _definitions.Encoding).UTF8;
                    // Write the file to the new location
                    const writeResult = await this.writeFile({
                        path: to,
                        directory: toDirectory,
                        data: file.data,
                        encoding: encoding
                    });
                    // Copy the mtime/ctime of a renamed file
                    if (doRename) await updateTime(to, ctime, fromObj.mtime);
                    // Resolve promise
                    return writeResult;
                }
            case 'directory':
                {
                    if (toObj) throw Error('Cannot move a directory over an existing object');
                    try {
                        // Create the to directory
                        await this.mkdir({
                            path: to,
                            directory: toDirectory,
                            recursive: false
                        });
                        // Copy the mtime/ctime of a renamed directory
                        if (doRename) await updateTime(to, ctime, fromObj.mtime);
                    } catch (e) {
                    // ignore
                    }
                    // Iterate over the contents of the from location
                    const contents = (await this.readdir({
                        path: from,
                        directory: fromDirectory
                    })).files;
                    for (const filename of contents)// Move item from the from directory to the to directory
                    await this._copy({
                        from: `${from}/${filename.name}`,
                        to: `${to}/${filename.name}`,
                        directory: fromDirectory,
                        toDirectory
                    }, doRename);
                    // Optionally remove the original from directory
                    if (doRename) await this.rmdir({
                        path: from,
                        directory: fromDirectory
                    });
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
FilesystemWeb._debug = true;

},{"@capacitor/core":"7x3mc","./definitions":"74agt","@parcel/transformer-js/src/esmodule-helpers.js":"gkKU3"}]},["kqkBW"], null, "parcelRequire30f2", {})

//# sourceMappingURL=web.f8269265.js.map
