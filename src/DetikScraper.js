"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var puppeteer = require("puppeteer");
var fs = require("fs");
var path = require("path");
var moment = require("moment");
// class paging > a untuk paginate ambil href
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var browser, context, listPage, page, maxPage, noResultFromLast, scraped, list, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 10, , 11]);
                return [4 /*yield*/, puppeteer.launch({
                        headless: false,
                        args: [
                            "--allow-external-pages",
                            "--allow-third-party-modules",
                            "--data-reduction-proxy-http-proxies",
                            "--no-sandbox",
                        ]
                    })];
            case 1:
                browser = _a.sent();
                return [4 /*yield*/, browser.createIncognitoBrowserContext()];
            case 2:
                context = _a.sent();
                return [4 /*yield*/, context.newPage()];
            case 3:
                listPage = _a.sent();
                console.log("Browser launched");
                // optimize fetching
                return [4 /*yield*/, listPage.setRequestInterception(true)];
            case 4:
                // optimize fetching
                _a.sent();
                listPage.on("request", function (req) {
                    var type = req.resourceType();
                    if (type == "stylesheet" || type == "image" || type == "font") {
                        req.abort();
                    }
                    else {
                        req["continue"]();
                    }
                });
                console.log("We should not load IMAGE CSS and FONT..");
                page = 1;
                maxPage = 3;
                noResultFromLast = false;
                scraped = [];
                _a.label = 5;
            case 5:
                if (!(!noResultFromLast && page <= maxPage)) return [3 /*break*/, 8];
                return [4 /*yield*/, listPage.goto("https://www.detik.com/search/searchall?query=corona&siteid=2&sortby=time&sorttime=0&page=" +
                        page)];
            case 6:
                _a.sent();
                console.log(" - Page " + page + " visited");
                return [4 /*yield*/, listPage.$eval(".list-berita", function (el) {
                        var articelEl = Array.from(el.getElementsByTagName("article")).filter(function (articel) {
                            var _a;
                            return (_a = articel.getElementsByClassName("category")[0]) === null || _a === void 0 ? void 0 : _a.innerHTML;
                        });
                        return articelEl.map(function (articel) {
                            var _a, _b, _c;
                            return ({
                                title: (_a = articel.getElementsByClassName("title")[0]) === null || _a === void 0 ? void 0 : _a.innerHTML,
                                category: (_b = articel.getElementsByClassName("category")[0]) === null || _b === void 0 ? void 0 : _b.innerHTML,
                                date: (_c = articel
                                    .getElementsByClassName("date")[0]) === null || _c === void 0 ? void 0 : _c.innerHTML.split("</span>")[1],
                                link: articel.getElementsByTagName("a")[0].getAttribute("href")
                            });
                        });
                    })];
            case 7:
                list = _a.sent();
                if (list.length > 0) {
                    scraped.push.apply(scraped, list);
                    page++;
                }
                else {
                    noResultFromLast = true;
                }
                return [3 /*break*/, 5];
            case 8:
                console.log("Scaping Done!");
                return [4 /*yield*/, browser.close()];
            case 9:
                _a.sent();
                console.log("Browser closed");
                fs.writeFileSync(path.join(__dirname, "collection/detik.com/" + moment().format("YYYY-MM-DD_SSS") + ".json"), JSON.stringify(scraped));
                console.log("Saved");
                return [3 /*break*/, 11];
            case 10:
                err_1 = _a.sent();
                console.error("'Puppeteer Error Detencted -> " + err_1 + "'");
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); })();
