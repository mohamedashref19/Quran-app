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
})({"features.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateKhatmahProgress = exports.startSurahReading = exports.manageKhatmah = exports.loadSurahs = exports.loadReciters = exports.loadQuranPage = exports.loadPrayers = exports.loadBookmarks = exports.createKhatmah = exports.checkRecitation = exports.addBookmark = void 0;
var _axios = _interopRequireDefault(require("axios"));
var _auth = require("./auth");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; } /* eslint-disable */
// 🗺️ خريطة بداية صفحات السور (1-114)
var surahStartPages = {
  1: 1,
  2: 2,
  3: 50,
  4: 77,
  5: 106,
  6: 128,
  7: 151,
  8: 177,
  9: 187,
  10: 208,
  11: 221,
  12: 235,
  13: 249,
  14: 255,
  15: 262,
  16: 267,
  17: 282,
  18: 293,
  19: 305,
  20: 312,
  21: 322,
  22: 332,
  23: 342,
  24: 350,
  25: 359,
  26: 367,
  27: 377,
  28: 385,
  29: 396,
  30: 404,
  31: 411,
  32: 415,
  33: 418,
  34: 428,
  35: 434,
  36: 440,
  37: 446,
  38: 453,
  39: 458,
  40: 467,
  41: 477,
  42: 483,
  43: 489,
  44: 496,
  45: 499,
  46: 502,
  47: 507,
  48: 511,
  49: 515,
  50: 518,
  51: 520,
  52: 523,
  53: 526,
  54: 528,
  55: 531,
  56: 534,
  57: 537,
  58: 542,
  59: 545,
  60: 549,
  61: 551,
  62: 553,
  63: 554,
  64: 556,
  65: 558,
  66: 560,
  67: 562,
  68: 564,
  69: 566,
  70: 568,
  71: 570,
  72: 572,
  73: 574,
  74: 575,
  75: 577,
  76: 578,
  77: 580,
  78: 582,
  79: 583,
  80: 585,
  81: 586,
  82: 587,
  83: 587,
  84: 589,
  85: 590,
  86: 591,
  87: 591,
  88: 592,
  89: 593,
  90: 594,
  91: 595,
  92: 595,
  93: 596,
  94: 596,
  95: 597,
  96: 597,
  97: 598,
  98: 598,
  99: 599,
  100: 599,
  101: 600,
  102: 600,
  103: 601,
  104: 601,
  105: 601,
  106: 602,
  107: 602,
  108: 602,
  109: 603,
  110: 603,
  111: 603,
  112: 604,
  113: 604,
  114: 604
};
var currentPage = 1;

// 1. فهرس السور
var loadSurahs = exports.loadSurahs = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var res, container, surahsList, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          _context.p = 0;
          _context.n = 1;
          return _axios.default.get('/api/v1/quran/surahs');
        case 1:
          res = _context.v;
          container = document.getElementById('surahs-container');
          if (container) {
            _context.n = 2;
            break;
          }
          return _context.a(2);
        case 2:
          container.innerHTML = '';
          surahsList = res.data.data.surahs;
          surahsList.forEach(function (surah) {
            var html = "\n        <div class=\"col-md-3 mb-3\">\n          <a href=\"/quran/".concat(surah._id, "\" class=\"text-decoration-none\">\n            <div class=\"card h-100 hover-shadow border-0 shadow-sm\">\n              <div class=\"card-body text-center\">\n                <div class=\"d-flex justify-content-center align-items-center mb-2\">\n                  <span class=\"badge bg-success rounded-circle p-2 me-2\">").concat(surah._id, "</span>\n                  <h5 class=\"card-title text-dark mb-0 fw-bold\" style=\"font-family: 'Amiri', serif;\">\u0633\u0648\u0631\u0629 ").concat(surah.arabicName, "</h5>\n                </div>\n                <p class=\"text-muted small mb-0\">\u0639\u062F\u062F \u0627\u0644\u0622\u064A\u0627\u062A: ").concat(surah.ayahCount, "</p>\n              </div>\n            </div>\n          </a>\n        </div>");
            container.insertAdjacentHTML('beforeend', html);
          });
          _context.n = 4;
          break;
        case 3:
          _context.p = 3;
          _t = _context.v;
          console.error(_t);
        case 4:
          return _context.a(2);
      }
    }, _callee, null, [[0, 3]]);
  }));
  return function loadSurahs() {
    return _ref.apply(this, arguments);
  };
}();

// 2. تحميل صفحة المصحف
var loadQuranPage = exports.loadQuranPage = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(pageNumber) {
    var res, ayahs, titleElem, container, fullTextHTML, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          _context2.p = 0;
          _context2.n = 1;
          return _axios.default.get("/api/v1/quran/page/".concat(pageNumber));
        case 1:
          res = _context2.v;
          ayahs = res.data.data.ayahs;
          currentPage = parseInt(pageNumber);
          titleElem = document.getElementById('surah-name');
          if (titleElem) titleElem.innerText = "\u0633\u064F\u0648\u0631\u064E\u0629\u064F ".concat(ayahs[0].surahNameAr || '...');
          container = document.getElementById('ayahs-container');
          if (container) {
            _context2.n = 2;
            break;
          }
          return _context2.a(2);
        case 2:
          container.innerHTML = '';
          fullTextHTML = '<div class="quran-page-content" style="text-align: justify; text-align-last: center; line-height: 2.8; font-family: \'Amiri\'; font-size: 22px; direction: rtl;">';
          ayahs.forEach(function (ayah) {
            var ayahNum = ayah.ayahNumber;

            // ✅ ترويسة السورة والبسملة
            if (ayahNum === 1) {
              if (ayah.surahNumber !== 1 && ayah.surahNumber !== 9) {
                fullTextHTML += "\n                <div class=\"surah-separator text-center my-4 p-2\" style=\"background: #f4f4f4; border: 1px solid #ddd; border-radius: 5px;\">\n                    <h3 class=\"text-success m-0\" style=\"font-family: 'Amiri';\">\u0633\u0648\u0631\u0629 ".concat(ayah.surahNameAr, "</h3>\n                </div>\n                <div class=\"bismillah text-center mb-3\">\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650</div>\n             ");
              }
            }

            // ✅ بناء الآية (إضافة واحدة لكل آية)
            fullTextHTML += "\n        <span class=\"ayah-text ayah-clickable\" \n              data-surah=\"".concat(ayah.surahNumber, "\" \n              data-ayah=\"").concat(ayahNum, "\"\n              title=\"\u062A\u0641\u0633\u064A\u0631 \u0627\u0644\u0622\u064A\u0629 ").concat(ayahNum, "\"\n              style=\"cursor: pointer;\">\n          ").concat(ayah.text, "\n        </span>\n        <span class=\"ayah-end-wrapper\" style=\"white-space: nowrap; display: inline-block;\">\n          <span class=\"ayah-end-symbol\" style=\"color: #d4af37; font-family: sans-serif; margin: 0 5px; border: 1px solid #d4af37; border-radius: 50%; padding: 0 5px; font-size: 0.8em;\">").concat(ayahNum, "</span>\n          <i class=\"far fa-bookmark bookmark-icon-btn\" \n             data-surah=\"").concat(ayah.surahNumber, "\" \n             data-ayah=\"").concat(ayahNum, "\" \n             title=\"\u062D\u0641\u0638 \u0639\u0644\u0627\u0645\u0629 \u0645\u0631\u062C\u0639\u064A\u0629\" \n             style=\"cursor: pointer; color: #ccc; font-size: 0.7em;\"></i>\n        </span>\n      ");
          });
          fullTextHTML += '</div><div class="text-center mt-3 text-muted small">- ' + currentPage + ' -</div>';
          container.innerHTML = fullTextHTML;
          updateNavButtons();
          _context2.n = 4;
          break;
        case 3:
          _context2.p = 3;
          _t2 = _context2.v;
          console.error(_t2);
        case 4:
          return _context2.a(2);
      }
    }, _callee2, null, [[0, 3]]);
  }));
  return function loadQuranPage(_x) {
    return _ref2.apply(this, arguments);
  };
}();

// 3. أزرار التنقل
var updateNavButtons = function updateNavButtons() {
  var nextBtn = document.getElementById('next-surah-btn');
  var prevBtn = document.getElementById('prev-surah-btn');
  if (nextBtn) {
    if (currentPage < 604) {
      nextBtn.classList.remove('d-none');
      nextBtn.onclick = function () {
        return loadQuranPage(currentPage + 1);
      };
    } else {
      nextBtn.classList.add('d-none');
    }
  }
  if (prevBtn) {
    if (currentPage > 1) {
      prevBtn.classList.remove('d-none');
      prevBtn.onclick = function () {
        return loadQuranPage(currentPage - 1);
      };
    } else {
      prevBtn.classList.add('d-none');
    }
  }
};

// 4. نقطة الدخول للسورة
var startSurahReading = exports.startSurahReading = function startSurahReading(surahNumber) {
  var startPage = surahStartPages[surahNumber] || 1;
  loadQuranPage(startPage);
};

// 5. Bookmark Functions
var addBookmark = exports.addBookmark = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(surah, ayah) {
    var res, _t3;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.p = _context3.n) {
        case 0:
          _context3.p = 0;
          _context3.n = 1;
          return _axios.default.post('/api/v1/bookmarks', {
            surahNumber: surah,
            ayahNumber: ayah
          });
        case 1:
          res = _context3.v;
          if (res.data.status === 'success') {
            (0, _auth.showAlert)('success', 'تم حفظ العلامة المرجعية 🔖');
          }
          _context3.n = 3;
          break;
        case 2:
          _context3.p = 2;
          _t3 = _context3.v;
          (0, _auth.showAlert)('error', 'يوجد علامة بالفعل أو حدث خطأ');
        case 3:
          return _context3.a(2);
      }
    }, _callee3, null, [[0, 2]]);
  }));
  return function addBookmark(_x2, _x3) {
    return _ref3.apply(this, arguments);
  };
}();
var loadBookmarks = exports.loadBookmarks = /*#__PURE__*/function () {
  var _ref4 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4() {
    var res, container, _t4;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.p = _context4.n) {
        case 0:
          _context4.p = 0;
          _context4.n = 1;
          return _axios.default.get('/api/v1/bookmarks');
        case 1:
          res = _context4.v;
          container = document.getElementById('bookmarks-container');
          if (container) {
            _context4.n = 2;
            break;
          }
          return _context4.a(2);
        case 2:
          container.innerHTML = '';
          if (!(res.data.data.length === 0)) {
            _context4.n = 3;
            break;
          }
          container.innerHTML = '<p class="text-center">لا توجد علامات محفوظة</p>';
          return _context4.a(2);
        case 3:
          res.data.data.forEach(function (b) {
            var html = "\n            <a href=\"/quran/".concat(b.surahNumber, "\" class=\"list-group-item list-group-item-action d-flex justify-content-between align-items-center\">\n                <div>\n                    <h5 class=\"mb-1\">\u0633\u0648\u0631\u0629 \u0631\u0642\u0645 ").concat(b.surahNumber, "</h5>\n                    <small>\u0622\u064A\u0629 \u0631\u0642\u0645 ").concat(b.ayahNumber, "</small>\n                </div>\n                <span class=\"badge bg-primary rounded-pill\">\u0627\u0630\u0647\u0628</span>\n            </a>");
            container.insertAdjacentHTML('beforeend', html);
          });
          _context4.n = 5;
          break;
        case 4:
          _context4.p = 4;
          _t4 = _context4.v;
          console.error(_t4);
        case 5:
          return _context4.a(2);
      }
    }, _callee4, null, [[0, 4]]);
  }));
  return function loadBookmarks() {
    return _ref4.apply(this, arguments);
  };
}();

// 6. Khatmah Functions
var manageKhatmah = exports.manageKhatmah = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee5() {
    var res, activeDiv, k, progress, createDiv, _t5;
    return _regenerator().w(function (_context5) {
      while (1) switch (_context5.p = _context5.n) {
        case 0:
          _context5.p = 0;
          _context5.n = 1;
          return _axios.default.get('/api/v1/khatmah');
        case 1:
          res = _context5.v;
          activeDiv = document.getElementById('active-khatmah');
          if (activeDiv) {
            _context5.n = 2;
            break;
          }
          return _context5.a(2);
        case 2:
          activeDiv.classList.remove('d-none');
          k = res.data.data.khatmah;
          document.getElementById('khatmah-name').innerText = k.name;
          document.getElementById('daily-target').innerText = res.data.data.message;
          progress = Math.round(k.currentSurah / 114 * 100);
          document.getElementById('progress-bar').style.width = "".concat(progress, "%");
          document.getElementById('progress-bar').innerText = "".concat(progress, "%");
          _context5.n = 4;
          break;
        case 3:
          _context5.p = 3;
          _t5 = _context5.v;
          createDiv = document.getElementById('create-khatmah');
          if (createDiv) createDiv.classList.remove('d-none');
        case 4:
          return _context5.a(2);
      }
    }, _callee5, null, [[0, 3]]);
  }));
  return function manageKhatmah() {
    return _ref5.apply(this, arguments);
  };
}();
var createKhatmah = exports.createKhatmah = /*#__PURE__*/function () {
  var _ref6 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee6(name, durationDays) {
    var res, _t6;
    return _regenerator().w(function (_context6) {
      while (1) switch (_context6.p = _context6.n) {
        case 0:
          _context6.p = 0;
          _context6.n = 1;
          return _axios.default.post('/api/v1/khatmah', {
            name: name,
            durationDays: durationDays
          });
        case 1:
          res = _context6.v;
          if (res.data.status === 'success') location.reload();
          _context6.n = 3;
          break;
        case 2:
          _context6.p = 2;
          _t6 = _context6.v;
          (0, _auth.showAlert)('error', _t6.response.data.message);
        case 3:
          return _context6.a(2);
      }
    }, _callee6, null, [[0, 2]]);
  }));
  return function createKhatmah(_x4, _x5) {
    return _ref6.apply(this, arguments);
  };
}();
var updateKhatmahProgress = exports.updateKhatmahProgress = /*#__PURE__*/function () {
  var _ref7 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee7(surah, ayah) {
    var res, _t7;
    return _regenerator().w(function (_context7) {
      while (1) switch (_context7.p = _context7.n) {
        case 0:
          _context7.p = 0;
          _context7.n = 1;
          return _axios.default.patch('/api/v1/khatmah', {
            surah: surah,
            ayah: ayah
          });
        case 1:
          res = _context7.v;
          if (res.data.status === 'success') {
            (0, _auth.showAlert)('success', 'تم تحديث التقدم!');
            setTimeout(function () {
              return location.reload();
            }, 1000);
          }
          _context7.n = 3;
          break;
        case 2:
          _context7.p = 2;
          _t7 = _context7.v;
          (0, _auth.showAlert)('error', 'فشل التحديث');
        case 3:
          return _context7.a(2);
      }
    }, _callee7, null, [[0, 2]]);
  }));
  return function updateKhatmahProgress(_x6, _x7) {
    return _ref7.apply(this, arguments);
  };
}();

// 7. Recitation Check
var checkRecitation = exports.checkRecitation = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee8(file) {
    var formData, res, _t8;
    return _regenerator().w(function (_context8) {
      while (1) switch (_context8.p = _context8.n) {
        case 0:
          formData = new FormData();
          formData.append('audio', file);
          _context8.p = 1;
          _context8.n = 2;
          return _axios.default.post('/api/v1/quran/check-recitation', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        case 2:
          res = _context8.v;
          document.getElementById('result-container').classList.remove('d-none');
          document.getElementById('ai-feedback').innerText = JSON.stringify(res.data);
          _context8.n = 4;
          break;
        case 3:
          _context8.p = 3;
          _t8 = _context8.v;
          (0, _auth.showAlert)('error', 'فشل تحليل الصوت');
        case 4:
          return _context8.a(2);
      }
    }, _callee8, null, [[1, 3]]);
  }));
  return function checkRecitation(_x8) {
    return _ref8.apply(this, arguments);
  };
}();

// 8. Load Reciters
var loadReciters = exports.loadReciters = /*#__PURE__*/function () {
  var _ref9 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee9() {
    var res, container, _t9;
    return _regenerator().w(function (_context9) {
      while (1) switch (_context9.p = _context9.n) {
        case 0:
          _context9.p = 0;
          _context9.n = 1;
          return _axios.default.get('/api/v1/audio/reciters');
        case 1:
          res = _context9.v;
          container = document.getElementById('reciters-container');
          if (container) {
            _context9.n = 2;
            break;
          }
          return _context9.a(2);
        case 2:
          container.innerHTML = '';
          res.data.data.forEach(function (reciter) {
            var html = "<div class=\"col-md-3\"><div class=\"card h-100 shadow-sm\"><div class=\"card-body\"><h5 class=\"card-title\">".concat(reciter.name, "</h5><p class=\"small text-muted\">").concat(reciter.rewaya, "</p><audio controls src=\"").concat(reciter.server, "/001.mp3\" class=\"w-100 mt-2\"></audio></div></div></div>");
            container.insertAdjacentHTML('beforeend', html);
          });
          _context9.n = 4;
          break;
        case 3:
          _context9.p = 3;
          _t9 = _context9.v;
          console.error(_t9);
        case 4:
          return _context9.a(2);
      }
    }, _callee9, null, [[0, 3]]);
  }));
  return function loadReciters() {
    return _ref9.apply(this, arguments);
  };
}();

// 9. Load Prayers
var loadPrayers = exports.loadPrayers = function loadPrayers() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(/*#__PURE__*/function () {
      var _ref0 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee0(position) {
        var _position$coords, latitude, longitude, res, timings, container, _i, _Object$entries, _Object$entries$_i, key, value, html, _t0;
        return _regenerator().w(function (_context0) {
          while (1) switch (_context0.p = _context0.n) {
            case 0:
              _context0.p = 0;
              _position$coords = position.coords, latitude = _position$coords.latitude, longitude = _position$coords.longitude;
              _context0.n = 1;
              return _axios.default.get("/api/v1/prayers?lat=".concat(latitude, "&lng=").concat(longitude));
            case 1:
              res = _context0.v;
              timings = res.data.data.timings;
              container = document.getElementById('prayers-list');
              if (container) {
                _context0.n = 2;
                break;
              }
              return _context0.a(2);
            case 2:
              document.getElementById('location-name').innerText = 'مواقيت الصلاة حسب موقعك الحالي';
              document.getElementById('hijri-date').innerText = res.data.data.hijri.date;
              container.innerHTML = '';
              for (_i = 0, _Object$entries = Object.entries(timings); _i < _Object$entries.length; _i++) {
                _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2), key = _Object$entries$_i[0], value = _Object$entries$_i[1];
                html = "<div class=\"list-group-item d-flex justify-content-between align-items-center\"><span class=\"fw-bold\">".concat(key, "</span><span class=\"badge bg-success rounded-pill\">").concat(value, "</span></div>");
                container.insertAdjacentHTML('beforeend', html);
              }
              _context0.n = 4;
              break;
            case 3:
              _context0.p = 3;
              _t0 = _context0.v;
              alert('فشل جلب المواقيت');
            case 4:
              return _context0.a(2);
          }
        }, _callee0, null, [[0, 3]]);
      }));
      return function (_x9) {
        return _ref0.apply(this, arguments);
      };
    }());
  }
};
},{"axios":"../../node_modules/axios/index.js","./auth":"auth.js"}],"../../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
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
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "56187" + '/');
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
//# sourceMappingURL=/features.b50c3a3e.js.map