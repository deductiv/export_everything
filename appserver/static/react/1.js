(this["webpackJsonpmain"] = this["webpackJsonpmain"] || []).push([[1],{

/***/ "./src/FileBrowserModal.js":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__("react"), __webpack_require__("./node_modules/react-bootstrap/esm/Modal.js"), __webpack_require__("./node_modules/chonky/dist/chonky.esm.js"), __webpack_require__("./node_modules/chonky-icon-fontawesome/dist/chonky-icon-fontawesome.esm.js")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (_exports, _react, _Modal, _chonky, _chonkyIconFontawesome) {
  "use strict";

  var _interopRequireDefault = __webpack_require__("./node_modules/@babel/runtime/helpers/interopRequireDefault.js");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9tYWluLy4vc3JjL0ZpbGVCcm93c2VyTW9kYWwuanMiXSwibmFtZXMiOlsic2V0Q2hvbmt5RGVmYXVsdHMiLCJpY29uQ29tcG9uZW50IiwiQ2hvbmt5SWNvbkZBIiwiQ2hvbmt5QWN0aW9ucyIsIlRvZ2dsZUhpZGRlbkZpbGVzIiwib3B0aW9uIiwiZGVmYXVsdFZhbHVlIiwiRmlsZUJyb3dzZXJNb2RhbCIsInByb3BzIiwic2hvdyIsIm9uSGlkZSIsImhlaWdodCIsInJlc2l6ZSIsImxvY2F0aW9uIiwiaW5zdGFuY2VJZCIsImZpbGVfbGlzdCIsImZvbGRlcl9jaGFpbiIsIm9uRmlsZUFjdGlvbiIsIkVuYWJsZUxpc3RWaWV3IiwiaWQiLCJPcGVuU2VsZWN0aW9uIiwiU2VsZWN0QWxsRmlsZXMiLCJDbGVhclNlbGVjdGlvbiIsIkVuYWJsZUNvbXBhY3RWaWV3IiwiRW5hYmxlR3JpZFZpZXciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7RUFnQkE7RUFDQTtFQWpCQTs7RUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7RUFNQSxJQUFBQSx5QkFBaUIsRUFBQztJQUFFQyxhQUFhLEVBQUVDO0VBQWEsQ0FBQyxDQUFDO0VBQ2xEQyxxQkFBYSxDQUFDQyxpQkFBaUIsQ0FBQ0MsTUFBTSxDQUFDQyxZQUFZLEdBQUcsS0FBSztFQUU1QyxTQUFTQyxnQkFBZ0IsQ0FBQ0MsS0FBSyxFQUFFO0lBQzVDLG9CQUNJLGdDQUFDO0lBQ0c7SUFBQTtNQUNBLEVBQUUsRUFBQyx1QkFBdUI7TUFDMUIsSUFBSSxFQUFFQSxLQUFLLENBQUNDLElBQUs7TUFDakIsTUFBTSxFQUFFRCxLQUFLLENBQUNFLE1BQU87TUFDckIsZUFBZSxFQUFFLGNBQWU7TUFDaEMsbUJBQWdCLGNBQWM7TUFDOUIsUUFBUSxFQUFFLElBQUs7TUFDZixTQUFTLEVBQUMsZUFBZTtNQUN6QixLQUFLLEVBQUU7UUFBQ0MsTUFBTSxFQUFFLEtBQUs7UUFBRUMsTUFBTSxFQUFFO01BQVU7SUFBRSxnQkFFM0MsZ0NBQUMsaUJBQUssQ0FBQyxNQUFNO01BQUMsV0FBVztJQUFBLGdCQUNyQixnQ0FBQyxpQkFBSyxDQUFDLEtBQUs7TUFBQyxFQUFFLEVBQUM7SUFBYyx3QkFDWkosS0FBSyxDQUFDSyxRQUFRLENBQ2xCLENBQ0gsZUFDZixnQ0FBQyxpQkFBSyxDQUFDLElBQUk7TUFDUCxLQUFLLEVBQUU7UUFBQ0YsTUFBTSxFQUFFO01BQU07SUFBRSxnQkFDeEIsZ0NBQUMsbUJBQVc7TUFDUixVQUFVLEVBQUVILEtBQUssQ0FBQ00sVUFBVztNQUM3QixLQUFLLEVBQUVOLEtBQUssQ0FBQ08sU0FBVTtNQUN2QixXQUFXLEVBQUVQLEtBQUssQ0FBQ1EsWUFBYTtNQUNoQyxtQkFBbUIsRUFBRSxJQUFLO01BQzFCLFlBQVksRUFBRVIsS0FBSyxDQUFDUyxZQUFhO01BQ2pDLHVCQUF1QixFQUFFZCxxQkFBYSxDQUFDZSxjQUFjLENBQUNDLEVBQUc7TUFDekQsa0JBQWtCLEVBQUUsSUFBSztNQUN6QiwwQkFBMEIsRUFBRSxJQUFLO01BQ2pDLGdCQUFnQixFQUFFLElBQUs7TUFDdkIseUJBQXlCLEVBQUUsQ0FDdkJoQixxQkFBYSxDQUFDaUIsYUFBYSxDQUFDRCxFQUFFLEVBQzlCaEIscUJBQWEsQ0FBQ2tCLGNBQWMsQ0FBQ0YsRUFBRSxFQUMvQmhCLHFCQUFhLENBQUNtQixjQUFjLENBQUNILEVBQUUsRUFDL0JoQixxQkFBYSxDQUFDb0IsaUJBQWlCLENBQUNKLEVBQUUsRUFDbENoQixxQkFBYSxDQUFDcUIsY0FBYyxDQUFDTCxFQUFFO0lBQ2pDLGdCQUVGLGdDQUFDLGtCQUFVLE9BQUcsZUFDZCxnQ0FBQyxtQkFBVyxPQUFHLGVBQ2YsZ0NBQUMsZ0JBQVEsT0FBRyxDQUNGLENBQ0wsQ0FDVDtFQUVoQjtBQUFDO0FBQUEscUciLCJmaWxlIjoiMS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEZpbGUgYnJvd3NlciBVSVxuXG4vKlxuXG5Qcm9wcyBsaXN0OlxuXG5zaG93XG5vbkhpZGVcbmxvY2F0aW9uXG5pbnN0YW5jZUlkXG5maWxlX2xpc3RcbmZvbGRlcl9jaGFpblxub25GaWxlQWN0aW9uXG5cbiovXG5cbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgTW9kYWwgZnJvbSAncmVhY3QtYm9vdHN0cmFwL01vZGFsJztcbmltcG9ydCB7IHNldENob25reURlZmF1bHRzLCBGaWxlQnJvd3NlciwgRmlsZU5hdmJhciwgRmlsZVRvb2xiYXIsIEZpbGVMaXN0LCBDaG9ua3lBY3Rpb25zIH0gZnJvbSAnY2hvbmt5JztcbmltcG9ydCB7IENob25reUljb25GQSB9IGZyb20gJ2Nob25reS1pY29uLWZvbnRhd2Vzb21lJztcbnNldENob25reURlZmF1bHRzKHsgaWNvbkNvbXBvbmVudDogQ2hvbmt5SWNvbkZBIH0pO1xuQ2hvbmt5QWN0aW9ucy5Ub2dnbGVIaWRkZW5GaWxlcy5vcHRpb24uZGVmYXVsdFZhbHVlID0gZmFsc2U7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEZpbGVCcm93c2VyTW9kYWwocHJvcHMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8TW9kYWxcbiAgICAgICAgICAgIC8vc2l6ZT1cImxnXCJcbiAgICAgICAgICAgIGlkPVwiZXBfZmlsZV9icm93c2VyX21vZGFsXCJcbiAgICAgICAgICAgIHNob3c9e3Byb3BzLnNob3d9XG4gICAgICAgICAgICBvbkhpZGU9e3Byb3BzLm9uSGlkZX1cbiAgICAgICAgICAgIGRpYWxvZ0NsYXNzTmFtZT17XCJwcmltYXJ5TW9kYWxcIn1cbiAgICAgICAgICAgIGFyaWEtbGFiZWxsZWRieT1cImZpbGVfYnJvd3NlclwiXG4gICAgICAgICAgICBjZW50ZXJlZD17dHJ1ZX1cbiAgICAgICAgICAgIGNsYXNzTmFtZT1cIm1vZGFsLXdpZGUgaW5cIlxuICAgICAgICAgICAgc3R5bGU9e3toZWlnaHQ6ICc2MCUnLCByZXNpemU6ICd2ZXJ0aWNhbCd9fVxuICAgICAgICA+XG4gICAgICAgICAgICA8TW9kYWwuSGVhZGVyIGNsb3NlQnV0dG9uPlxuICAgICAgICAgICAgICAgIDxNb2RhbC5UaXRsZSBpZD1cImZpbGVfYnJvd3NlclwiPlxuICAgICAgICAgICAgICAgIEJyb3dzZSBMb2NhdGlvbjoge3Byb3BzLmxvY2F0aW9ufVxuICAgICAgICAgICAgICAgIDwvTW9kYWwuVGl0bGU+XG4gICAgICAgICAgICA8L01vZGFsLkhlYWRlcj5cbiAgICAgICAgICAgIDxNb2RhbC5Cb2R5XG4gICAgICAgICAgICAgICAgc3R5bGU9e3toZWlnaHQ6ICcxMDAlJ319PlxuICAgICAgICAgICAgICAgIDxGaWxlQnJvd3NlclxuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUlkPXtwcm9wcy5pbnN0YW5jZUlkfVxuICAgICAgICAgICAgICAgICAgICBmaWxlcz17cHJvcHMuZmlsZV9saXN0fVxuICAgICAgICAgICAgICAgICAgICBmb2xkZXJDaGFpbj17cHJvcHMuZm9sZGVyX2NoYWlufVxuICAgICAgICAgICAgICAgICAgICBmaWxsUGFyZW50Q29udGFpbmVyPXt0cnVlfVxuICAgICAgICAgICAgICAgICAgICBvbkZpbGVBY3Rpb249e3Byb3BzLm9uRmlsZUFjdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdEZpbGVWaWV3QWN0aW9uSWQ9e0Nob25reUFjdGlvbnMuRW5hYmxlTGlzdFZpZXcuaWR9XG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVEcmFnQW5kRHJvcD17dHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZURyYWdBbmREcm9wUHJvdmlkZXI9e3RydWV9XG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVTZWxlY3Rpb249e3RydWV9XG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVEZWZhdWx0RmlsZUFjdGlvbnM9e1tcbiAgICAgICAgICAgICAgICAgICAgICAgIENob25reUFjdGlvbnMuT3BlblNlbGVjdGlvbi5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIENob25reUFjdGlvbnMuU2VsZWN0QWxsRmlsZXMuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBDaG9ua3lBY3Rpb25zLkNsZWFyU2VsZWN0aW9uLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2hvbmt5QWN0aW9ucy5FbmFibGVDb21wYWN0Vmlldy5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIENob25reUFjdGlvbnMuRW5hYmxlR3JpZFZpZXcuaWRcbiAgICAgICAgICAgICAgICAgICAgXX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxGaWxlTmF2YmFyIC8+XG4gICAgICAgICAgICAgICAgICAgIDxGaWxlVG9vbGJhciAvPlxuICAgICAgICAgICAgICAgICAgICA8RmlsZUxpc3QgLz5cbiAgICAgICAgICAgICAgICA8L0ZpbGVCcm93c2VyPlxuICAgICAgICAgICAgPC9Nb2RhbC5Cb2R5PlxuICAgICAgICA8L01vZGFsPlxuICAgICk7XG59XG4iXSwic291cmNlUm9vdCI6IiJ9