/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["main"] = factory();
	else
		root["main"] = factory();
})(globalThis, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/SnackbarUtils.jsx":
/*!*******************************!*\
  !*** ./src/SnackbarUtils.jsx ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\nclass SnackbarUtils {\n  snackBar = {\n    enqueueSnackbar: () => {},\n    closeSnackbar: () => {}\n  };\n  setSnackBar(enqueueSnackbar, closeSnackbar) {\n    this.snackBar.enqueueSnackbar = enqueueSnackbar;\n    this.snackBar.closeSnackbar = closeSnackbar;\n  }\n  success(msg, options = {}) {\n    return this.toast(msg, {\n      ...options,\n      variant: 'success'\n    });\n  }\n  warning(msg, options = {}) {\n    return this.toast(msg, {\n      ...options,\n      variant: 'warning'\n    });\n  }\n  info(msg, options = {}) {\n    return this.toast(msg, {\n      ...options,\n      variant: 'info'\n    });\n  }\n  error(msg, options = {}) {\n    return this.toast(msg, {\n      ...options,\n      variant: 'error'\n    });\n  }\n  toast(msg, options = {}) {\n    const finalOptions = {\n      variant: 'default',\n      ...options\n    };\n    return this.snackBar.enqueueSnackbar(msg, {\n      ...finalOptions\n    });\n  }\n  closeSnackbar(key) {\n    this.snackBar.closeSnackbar(key);\n  }\n}\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new SnackbarUtils());//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvU25hY2tiYXJVdGlscy5qc3giLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUFBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUFBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUFBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFBQTtBQUFBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUEiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9tYWluLy4vc3JjL1NuYWNrYmFyVXRpbHMuanN4P2I5ZTQiXSwic291cmNlc0NvbnRlbnQiOlsiY2xhc3MgU25hY2tiYXJVdGlscyB7XG4gIHNuYWNrQmFyID0ge1xuICAgIGVucXVldWVTbmFja2JhcjogKCkgPT4ge30sXG4gICAgY2xvc2VTbmFja2JhcjogKCkgPT4ge31cbiAgfVxuXG4gIHNldFNuYWNrQmFyIChlbnF1ZXVlU25hY2tiYXIsIGNsb3NlU25hY2tiYXIpIHtcbiAgICB0aGlzLnNuYWNrQmFyLmVucXVldWVTbmFja2JhciA9IGVucXVldWVTbmFja2JhclxuICAgIHRoaXMuc25hY2tCYXIuY2xvc2VTbmFja2JhciA9IGNsb3NlU25hY2tiYXJcbiAgfVxuXG4gIHN1Y2Nlc3MgKG1zZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMudG9hc3QobXNnLCB7IC4uLm9wdGlvbnMsIHZhcmlhbnQ6ICdzdWNjZXNzJyB9KVxuICB9XG5cbiAgd2FybmluZyAobXNnLCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gdGhpcy50b2FzdChtc2csIHsgLi4ub3B0aW9ucywgdmFyaWFudDogJ3dhcm5pbmcnIH0pXG4gIH1cblxuICBpbmZvIChtc2csIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiB0aGlzLnRvYXN0KG1zZywgeyAuLi5vcHRpb25zLCB2YXJpYW50OiAnaW5mbycgfSlcbiAgfVxuXG4gIGVycm9yIChtc2csIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiB0aGlzLnRvYXN0KG1zZywgeyAuLi5vcHRpb25zLCB2YXJpYW50OiAnZXJyb3InIH0pXG4gIH1cblxuICB0b2FzdCAobXNnLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBmaW5hbE9wdGlvbnMgPSB7XG4gICAgICB2YXJpYW50OiAnZGVmYXVsdCcsXG4gICAgICAuLi5vcHRpb25zXG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNuYWNrQmFyLmVucXVldWVTbmFja2Jhcihtc2csIHsgLi4uZmluYWxPcHRpb25zIH0pXG4gIH1cblxuICBjbG9zZVNuYWNrYmFyIChrZXkpIHtcbiAgICB0aGlzLnNuYWNrQmFyLmNsb3NlU25hY2tiYXIoa2V5KVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBTbmFja2JhclV0aWxzKClcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/SnackbarUtils.jsx\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/SnackbarUtils.jsx"](0, __webpack_exports__, __webpack_require__);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});