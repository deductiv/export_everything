(this["webpackJsonpmain"] = this["webpackJsonpmain"] || []).push([[2],{

/***/ "./src/FileBrowserModal.js":
/*!*********************************!*\
  !*** ./src/FileBrowserModal.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(/*! react */ "react"), __webpack_require__(/*! react-bootstrap/Modal */ "./node_modules/react-bootstrap/esm/Modal.js"), __webpack_require__(/*! chonky */ "./node_modules/chonky/dist/chonky.esm.js"), __webpack_require__(/*! chonky-icon-fontawesome */ "./node_modules/chonky-icon-fontawesome/dist/chonky-icon-fontawesome.esm.js")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (_exports, _react, _Modal, _chonky, _chonkyIconFontawesome) {
  "use strict";

  var _interopRequireDefault = __webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");
  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports["default"] = FileBrowserModal;
  _react = _interopRequireDefault(_react);
  _Modal = _interopRequireDefault(_Modal);
  // File browser UI

  /*
  
  Props list:
  
  show
  onHide
  location
  instanceId
  file_list
  folder_chain
  onFileAction
  
  */

  (0, _chonky.setChonkyDefaults)({
    iconComponent: _chonkyIconFontawesome.ChonkyIconFA
  });
  _chonky.ChonkyActions.ToggleHiddenFiles.option.defaultValue = false;
  function FileBrowserModal(props) {
    return /*#__PURE__*/_react["default"].createElement(_Modal["default"]
    //size="lg"
    , {
      id: "ep_file_browser_modal",
      show: props.show,
      onHide: props.onHide,
      dialogClassName: "primaryModal",
      "aria-labelledby": "file_browser",
      centered: true,
      className: "modal-wide in",
      style: {
        height: '60%',
        resize: 'vertical'
      }
    }, /*#__PURE__*/_react["default"].createElement(_Modal["default"].Header, {
      closeButton: true
    }, /*#__PURE__*/_react["default"].createElement(_Modal["default"].Title, {
      id: "file_browser"
    }, "Browse Location: ", props.location)), /*#__PURE__*/_react["default"].createElement(_Modal["default"].Body, {
      style: {
        height: '100%'
      }
    }, /*#__PURE__*/_react["default"].createElement(_chonky.FileBrowser, {
      instanceId: props.instanceId,
      files: props.file_list,
      folderChain: props.folder_chain,
      fillParentContainer: true,
      onFileAction: props.onFileAction,
      defaultFileViewActionId: _chonky.ChonkyActions.EnableListView.id,
      disableDragAndDrop: true,
      disableDragAndDropProvider: true,
      disableSelection: true,
      disableDefaultFileActions: [_chonky.ChonkyActions.OpenSelection.id, _chonky.ChonkyActions.SelectAllFiles.id, _chonky.ChonkyActions.ClearSelection.id, _chonky.ChonkyActions.EnableCompactView.id, _chonky.ChonkyActions.EnableGridView.id]
    }, /*#__PURE__*/_react["default"].createElement(_chonky.FileNavbar, null), /*#__PURE__*/_react["default"].createElement(_chonky.FileToolbar, null), /*#__PURE__*/_react["default"].createElement(_chonky.FileList, null))));
  }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ })

}]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9tYWluLy4vc3JjL0ZpbGVCcm93c2VyTW9kYWwuanMiXSwibmFtZXMiOlsic2V0Q2hvbmt5RGVmYXVsdHMiLCJpY29uQ29tcG9uZW50IiwiQ2hvbmt5SWNvbkZBIiwiQ2hvbmt5QWN0aW9ucyIsIlRvZ2dsZUhpZGRlbkZpbGVzIiwib3B0aW9uIiwiZGVmYXVsdFZhbHVlIiwiRmlsZUJyb3dzZXJNb2RhbCIsInByb3BzIiwic2hvdyIsIm9uSGlkZSIsImhlaWdodCIsInJlc2l6ZSIsImxvY2F0aW9uIiwiaW5zdGFuY2VJZCIsImZpbGVfbGlzdCIsImZvbGRlcl9jaGFpbiIsIm9uRmlsZUFjdGlvbiIsIkVuYWJsZUxpc3RWaWV3IiwiaWQiLCJPcGVuU2VsZWN0aW9uIiwiU2VsZWN0QWxsRmlsZXMiLCJDbGVhclNlbGVjdGlvbiIsIkVuYWJsZUNvbXBhY3RWaWV3IiwiRW5hYmxlR3JpZFZpZXciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBZ0JBO0VBQ0E7RUFqQkE7O0VBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0VBTUEsSUFBQUEseUJBQWlCLEVBQUM7SUFBRUMsYUFBYSxFQUFFQztFQUFhLENBQUMsQ0FBQztFQUNsREMscUJBQWEsQ0FBQ0MsaUJBQWlCLENBQUNDLE1BQU0sQ0FBQ0MsWUFBWSxHQUFHLEtBQUs7RUFFNUMsU0FBU0MsZ0JBQWdCLENBQUNDLEtBQUssRUFBRTtJQUM1QyxvQkFDSSxnQ0FBQztJQUNHO0lBQUE7TUFDQSxFQUFFLEVBQUMsdUJBQXVCO01BQzFCLElBQUksRUFBRUEsS0FBSyxDQUFDQyxJQUFLO01BQ2pCLE1BQU0sRUFBRUQsS0FBSyxDQUFDRSxNQUFPO01BQ3JCLGVBQWUsRUFBRSxjQUFlO01BQ2hDLG1CQUFnQixjQUFjO01BQzlCLFFBQVEsRUFBRSxJQUFLO01BQ2YsU0FBUyxFQUFDLGVBQWU7TUFDekIsS0FBSyxFQUFFO1FBQUNDLE1BQU0sRUFBRSxLQUFLO1FBQUVDLE1BQU0sRUFBRTtNQUFVO0lBQUUsZ0JBRTNDLGdDQUFDLGlCQUFLLENBQUMsTUFBTTtNQUFDLFdBQVc7SUFBQSxnQkFDckIsZ0NBQUMsaUJBQUssQ0FBQyxLQUFLO01BQUMsRUFBRSxFQUFDO0lBQWMsd0JBQ1pKLEtBQUssQ0FBQ0ssUUFBUSxDQUNsQixDQUNILGVBQ2YsZ0NBQUMsaUJBQUssQ0FBQyxJQUFJO01BQ1AsS0FBSyxFQUFFO1FBQUNGLE1BQU0sRUFBRTtNQUFNO0lBQUUsZ0JBQ3hCLGdDQUFDLG1CQUFXO01BQ1IsVUFBVSxFQUFFSCxLQUFLLENBQUNNLFVBQVc7TUFDN0IsS0FBSyxFQUFFTixLQUFLLENBQUNPLFNBQVU7TUFDdkIsV0FBVyxFQUFFUCxLQUFLLENBQUNRLFlBQWE7TUFDaEMsbUJBQW1CLEVBQUUsSUFBSztNQUMxQixZQUFZLEVBQUVSLEtBQUssQ0FBQ1MsWUFBYTtNQUNqQyx1QkFBdUIsRUFBRWQscUJBQWEsQ0FBQ2UsY0FBYyxDQUFDQyxFQUFHO01BQ3pELGtCQUFrQixFQUFFLElBQUs7TUFDekIsMEJBQTBCLEVBQUUsSUFBSztNQUNqQyxnQkFBZ0IsRUFBRSxJQUFLO01BQ3ZCLHlCQUF5QixFQUFFLENBQ3ZCaEIscUJBQWEsQ0FBQ2lCLGFBQWEsQ0FBQ0QsRUFBRSxFQUM5QmhCLHFCQUFhLENBQUNrQixjQUFjLENBQUNGLEVBQUUsRUFDL0JoQixxQkFBYSxDQUFDbUIsY0FBYyxDQUFDSCxFQUFFLEVBQy9CaEIscUJBQWEsQ0FBQ29CLGlCQUFpQixDQUFDSixFQUFFLEVBQ2xDaEIscUJBQWEsQ0FBQ3FCLGNBQWMsQ0FBQ0wsRUFBRTtJQUNqQyxnQkFFRixnQ0FBQyxrQkFBVSxPQUFHLGVBQ2QsZ0NBQUMsbUJBQVcsT0FBRyxlQUNmLGdDQUFDLGdCQUFRLE9BQUcsQ0FDRixDQUNMLENBQ1Q7RUFFaEI7QUFBQztBQUFBLHFHIiwiZmlsZSI6IjIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBGaWxlIGJyb3dzZXIgVUlcblxuLypcblxuUHJvcHMgbGlzdDpcblxuc2hvd1xub25IaWRlXG5sb2NhdGlvblxuaW5zdGFuY2VJZFxuZmlsZV9saXN0XG5mb2xkZXJfY2hhaW5cbm9uRmlsZUFjdGlvblxuXG4qL1xuXG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IE1vZGFsIGZyb20gJ3JlYWN0LWJvb3RzdHJhcC9Nb2RhbCc7XG5pbXBvcnQgeyBzZXRDaG9ua3lEZWZhdWx0cywgRmlsZUJyb3dzZXIsIEZpbGVOYXZiYXIsIEZpbGVUb29sYmFyLCBGaWxlTGlzdCwgQ2hvbmt5QWN0aW9ucyB9IGZyb20gJ2Nob25reSc7XG5pbXBvcnQgeyBDaG9ua3lJY29uRkEgfSBmcm9tICdjaG9ua3ktaWNvbi1mb250YXdlc29tZSc7XG5zZXRDaG9ua3lEZWZhdWx0cyh7IGljb25Db21wb25lbnQ6IENob25reUljb25GQSB9KTtcbkNob25reUFjdGlvbnMuVG9nZ2xlSGlkZGVuRmlsZXMub3B0aW9uLmRlZmF1bHRWYWx1ZSA9IGZhbHNlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBGaWxlQnJvd3Nlck1vZGFsKHByb3BzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPE1vZGFsXG4gICAgICAgICAgICAvL3NpemU9XCJsZ1wiXG4gICAgICAgICAgICBpZD1cImVwX2ZpbGVfYnJvd3Nlcl9tb2RhbFwiXG4gICAgICAgICAgICBzaG93PXtwcm9wcy5zaG93fVxuICAgICAgICAgICAgb25IaWRlPXtwcm9wcy5vbkhpZGV9XG4gICAgICAgICAgICBkaWFsb2dDbGFzc05hbWU9e1wicHJpbWFyeU1vZGFsXCJ9XG4gICAgICAgICAgICBhcmlhLWxhYmVsbGVkYnk9XCJmaWxlX2Jyb3dzZXJcIlxuICAgICAgICAgICAgY2VudGVyZWQ9e3RydWV9XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJtb2RhbC13aWRlIGluXCJcbiAgICAgICAgICAgIHN0eWxlPXt7aGVpZ2h0OiAnNjAlJywgcmVzaXplOiAndmVydGljYWwnfX1cbiAgICAgICAgPlxuICAgICAgICAgICAgPE1vZGFsLkhlYWRlciBjbG9zZUJ1dHRvbj5cbiAgICAgICAgICAgICAgICA8TW9kYWwuVGl0bGUgaWQ9XCJmaWxlX2Jyb3dzZXJcIj5cbiAgICAgICAgICAgICAgICBCcm93c2UgTG9jYXRpb246IHtwcm9wcy5sb2NhdGlvbn1cbiAgICAgICAgICAgICAgICA8L01vZGFsLlRpdGxlPlxuICAgICAgICAgICAgPC9Nb2RhbC5IZWFkZXI+XG4gICAgICAgICAgICA8TW9kYWwuQm9keVxuICAgICAgICAgICAgICAgIHN0eWxlPXt7aGVpZ2h0OiAnMTAwJSd9fT5cbiAgICAgICAgICAgICAgICA8RmlsZUJyb3dzZXJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VJZD17cHJvcHMuaW5zdGFuY2VJZH1cbiAgICAgICAgICAgICAgICAgICAgZmlsZXM9e3Byb3BzLmZpbGVfbGlzdH1cbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyQ2hhaW49e3Byb3BzLmZvbGRlcl9jaGFpbn1cbiAgICAgICAgICAgICAgICAgICAgZmlsbFBhcmVudENvbnRhaW5lcj17dHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgb25GaWxlQWN0aW9uPXtwcm9wcy5vbkZpbGVBY3Rpb259XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRGaWxlVmlld0FjdGlvbklkPXtDaG9ua3lBY3Rpb25zLkVuYWJsZUxpc3RWaWV3LmlkfVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRHJhZ0FuZERyb3A9e3RydWV9XG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVEcmFnQW5kRHJvcFByb3ZpZGVyPXt0cnVlfVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlU2VsZWN0aW9uPXt0cnVlfVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRGVmYXVsdEZpbGVBY3Rpb25zPXtbXG4gICAgICAgICAgICAgICAgICAgICAgICBDaG9ua3lBY3Rpb25zLk9wZW5TZWxlY3Rpb24uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBDaG9ua3lBY3Rpb25zLlNlbGVjdEFsbEZpbGVzLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2hvbmt5QWN0aW9ucy5DbGVhclNlbGVjdGlvbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIENob25reUFjdGlvbnMuRW5hYmxlQ29tcGFjdFZpZXcuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBDaG9ua3lBY3Rpb25zLkVuYWJsZUdyaWRWaWV3LmlkXG4gICAgICAgICAgICAgICAgICAgIF19XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8RmlsZU5hdmJhciAvPlxuICAgICAgICAgICAgICAgICAgICA8RmlsZVRvb2xiYXIgLz5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVMaXN0IC8+XG4gICAgICAgICAgICAgICAgPC9GaWxlQnJvd3Nlcj5cbiAgICAgICAgICAgIDwvTW9kYWwuQm9keT5cbiAgICAgICAgPC9Nb2RhbD5cbiAgICApO1xufVxuIl0sInNvdXJjZVJvb3QiOiIifQ==