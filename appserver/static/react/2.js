(this["webpackJsonpmain"] = this["webpackJsonpmain"] || []).push([[2],{

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
    return /*#__PURE__*/_react["default"].createElement(_Modal["default"] //size="lg"
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9tYWluLy4vc3JjL0ZpbGVCcm93c2VyTW9kYWwuanMiXSwibmFtZXMiOlsiaWNvbkNvbXBvbmVudCIsIkNob25reUljb25GQSIsIkNob25reUFjdGlvbnMiLCJUb2dnbGVIaWRkZW5GaWxlcyIsIm9wdGlvbiIsImRlZmF1bHRWYWx1ZSIsIkZpbGVCcm93c2VyTW9kYWwiLCJwcm9wcyIsInNob3ciLCJvbkhpZGUiLCJoZWlnaHQiLCJyZXNpemUiLCJsb2NhdGlvbiIsImluc3RhbmNlSWQiLCJmaWxlX2xpc3QiLCJmb2xkZXJfY2hhaW4iLCJvbkZpbGVBY3Rpb24iLCJFbmFibGVMaXN0VmlldyIsImlkIiwiT3BlblNlbGVjdGlvbiIsIlNlbGVjdEFsbEZpbGVzIiwiQ2xlYXJTZWxlY3Rpb24iLCJFbmFibGVDb21wYWN0VmlldyIsIkVuYWJsZUdyaWRWaWV3Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQWdCQTtBQUNBO0FBakJBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBTUEsaUNBQWtCO0FBQUVBLGlCQUFhLEVBQUVDO0FBQWpCLEdBQWxCO0FBQ0FDLHdCQUFjQyxpQkFBZCxDQUFnQ0MsTUFBaEMsQ0FBdUNDLFlBQXZDLEdBQXNELEtBQXREOztBQUVlLFdBQVNDLGdCQUFULENBQTBCQyxLQUExQixFQUFpQztBQUM1Qyx3QkFDSSxnQ0FBQyxpQkFBRCxDQUNJO0FBREo7QUFFSSxRQUFFLEVBQUMsdUJBRlA7QUFHSSxVQUFJLEVBQUVBLEtBQUssQ0FBQ0MsSUFIaEI7QUFJSSxZQUFNLEVBQUVELEtBQUssQ0FBQ0UsTUFKbEI7QUFLSSxxQkFBZSxFQUFFLGNBTHJCO0FBTUkseUJBQWdCLGNBTnBCO0FBT0ksY0FBUSxFQUFFLElBUGQ7QUFRSSxlQUFTLEVBQUMsZUFSZDtBQVNJLFdBQUssRUFBRTtBQUFDQyxjQUFNLEVBQUUsS0FBVDtBQUFnQkMsY0FBTSxFQUFFO0FBQXhCO0FBVFgsb0JBV0ksZ0NBQUMsaUJBQUQsQ0FBTyxNQUFQO0FBQWMsaUJBQVc7QUFBekIsb0JBQ0ksZ0NBQUMsaUJBQUQsQ0FBTyxLQUFQO0FBQWEsUUFBRSxFQUFDO0FBQWhCLDRCQUNrQkosS0FBSyxDQUFDSyxRQUR4QixDQURKLENBWEosZUFnQkksZ0NBQUMsaUJBQUQsQ0FBTyxJQUFQO0FBQ0ksV0FBSyxFQUFFO0FBQUNGLGNBQU0sRUFBRTtBQUFUO0FBRFgsb0JBRUksZ0NBQUMsbUJBQUQ7QUFDSSxnQkFBVSxFQUFFSCxLQUFLLENBQUNNLFVBRHRCO0FBRUksV0FBSyxFQUFFTixLQUFLLENBQUNPLFNBRmpCO0FBR0ksaUJBQVcsRUFBRVAsS0FBSyxDQUFDUSxZQUh2QjtBQUlJLHlCQUFtQixFQUFFLElBSnpCO0FBS0ksa0JBQVksRUFBRVIsS0FBSyxDQUFDUyxZQUx4QjtBQU1JLDZCQUF1QixFQUFFZCxzQkFBY2UsY0FBZCxDQUE2QkMsRUFOMUQ7QUFPSSx3QkFBa0IsRUFBRSxJQVB4QjtBQVFJLGdDQUEwQixFQUFFLElBUmhDO0FBU0ksc0JBQWdCLEVBQUUsSUFUdEI7QUFVSSwrQkFBeUIsRUFBRSxDQUN2QmhCLHNCQUFjaUIsYUFBZCxDQUE0QkQsRUFETCxFQUV2QmhCLHNCQUFja0IsY0FBZCxDQUE2QkYsRUFGTixFQUd2QmhCLHNCQUFjbUIsY0FBZCxDQUE2QkgsRUFITixFQUl2QmhCLHNCQUFjb0IsaUJBQWQsQ0FBZ0NKLEVBSlQsRUFLdkJoQixzQkFBY3FCLGNBQWQsQ0FBNkJMLEVBTE47QUFWL0Isb0JBa0JJLGdDQUFDLGtCQUFELE9BbEJKLGVBbUJJLGdDQUFDLG1CQUFELE9BbkJKLGVBb0JJLGdDQUFDLGdCQUFELE9BcEJKLENBRkosQ0FoQkosQ0FESjtBQTRDSCIsImZpbGUiOiIyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gRmlsZSBicm93c2VyIFVJXG5cbi8qXG5cblByb3BzIGxpc3Q6XG5cbnNob3dcbm9uSGlkZVxubG9jYXRpb25cbmluc3RhbmNlSWRcbmZpbGVfbGlzdFxuZm9sZGVyX2NoYWluXG5vbkZpbGVBY3Rpb25cblxuKi9cblxuaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBNb2RhbCBmcm9tICdyZWFjdC1ib290c3RyYXAvTW9kYWwnO1xuaW1wb3J0IHsgc2V0Q2hvbmt5RGVmYXVsdHMsIEZpbGVCcm93c2VyLCBGaWxlTmF2YmFyLCBGaWxlVG9vbGJhciwgRmlsZUxpc3QsIENob25reUFjdGlvbnMgfSBmcm9tICdjaG9ua3knO1xuaW1wb3J0IHsgQ2hvbmt5SWNvbkZBIH0gZnJvbSAnY2hvbmt5LWljb24tZm9udGF3ZXNvbWUnO1xuc2V0Q2hvbmt5RGVmYXVsdHMoeyBpY29uQ29tcG9uZW50OiBDaG9ua3lJY29uRkEgfSk7XG5DaG9ua3lBY3Rpb25zLlRvZ2dsZUhpZGRlbkZpbGVzLm9wdGlvbi5kZWZhdWx0VmFsdWUgPSBmYWxzZTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gRmlsZUJyb3dzZXJNb2RhbChwcm9wcykge1xuICAgIHJldHVybiAoXG4gICAgICAgIDxNb2RhbFxuICAgICAgICAgICAgLy9zaXplPVwibGdcIlxuICAgICAgICAgICAgaWQ9XCJlcF9maWxlX2Jyb3dzZXJfbW9kYWxcIlxuICAgICAgICAgICAgc2hvdz17cHJvcHMuc2hvd31cbiAgICAgICAgICAgIG9uSGlkZT17cHJvcHMub25IaWRlfVxuICAgICAgICAgICAgZGlhbG9nQ2xhc3NOYW1lPXtcInByaW1hcnlNb2RhbFwifVxuICAgICAgICAgICAgYXJpYS1sYWJlbGxlZGJ5PVwiZmlsZV9icm93c2VyXCJcbiAgICAgICAgICAgIGNlbnRlcmVkPXt0cnVlfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwibW9kYWwtd2lkZSBpblwiXG4gICAgICAgICAgICBzdHlsZT17e2hlaWdodDogJzYwJScsIHJlc2l6ZTogJ3ZlcnRpY2FsJ319XG4gICAgICAgID5cbiAgICAgICAgICAgIDxNb2RhbC5IZWFkZXIgY2xvc2VCdXR0b24+XG4gICAgICAgICAgICAgICAgPE1vZGFsLlRpdGxlIGlkPVwiZmlsZV9icm93c2VyXCI+XG4gICAgICAgICAgICAgICAgQnJvd3NlIExvY2F0aW9uOiB7cHJvcHMubG9jYXRpb259XG4gICAgICAgICAgICAgICAgPC9Nb2RhbC5UaXRsZT5cbiAgICAgICAgICAgIDwvTW9kYWwuSGVhZGVyPlxuICAgICAgICAgICAgPE1vZGFsLkJvZHlcbiAgICAgICAgICAgICAgICBzdHlsZT17e2hlaWdodDogJzEwMCUnfX0+XG4gICAgICAgICAgICAgICAgPEZpbGVCcm93c2VyXG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlSWQ9e3Byb3BzLmluc3RhbmNlSWR9XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzPXtwcm9wcy5maWxlX2xpc3R9XG4gICAgICAgICAgICAgICAgICAgIGZvbGRlckNoYWluPXtwcm9wcy5mb2xkZXJfY2hhaW59XG4gICAgICAgICAgICAgICAgICAgIGZpbGxQYXJlbnRDb250YWluZXI9e3RydWV9XG4gICAgICAgICAgICAgICAgICAgIG9uRmlsZUFjdGlvbj17cHJvcHMub25GaWxlQWN0aW9ufVxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0RmlsZVZpZXdBY3Rpb25JZD17Q2hvbmt5QWN0aW9ucy5FbmFibGVMaXN0Vmlldy5pZH1cbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZURyYWdBbmREcm9wPXt0cnVlfVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlRHJhZ0FuZERyb3BQcm92aWRlcj17dHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZVNlbGVjdGlvbj17dHJ1ZX1cbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZURlZmF1bHRGaWxlQWN0aW9ucz17W1xuICAgICAgICAgICAgICAgICAgICAgICAgQ2hvbmt5QWN0aW9ucy5PcGVuU2VsZWN0aW9uLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2hvbmt5QWN0aW9ucy5TZWxlY3RBbGxGaWxlcy5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIENob25reUFjdGlvbnMuQ2xlYXJTZWxlY3Rpb24uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBDaG9ua3lBY3Rpb25zLkVuYWJsZUNvbXBhY3RWaWV3LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgQ2hvbmt5QWN0aW9ucy5FbmFibGVHcmlkVmlldy5pZFxuICAgICAgICAgICAgICAgICAgICBdfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVOYXZiYXIgLz5cbiAgICAgICAgICAgICAgICAgICAgPEZpbGVUb29sYmFyIC8+XG4gICAgICAgICAgICAgICAgICAgIDxGaWxlTGlzdCAvPlxuICAgICAgICAgICAgICAgIDwvRmlsZUJyb3dzZXI+XG4gICAgICAgICAgICA8L01vZGFsLkJvZHk+XG4gICAgICAgIDwvTW9kYWw+XG4gICAgKTtcbn1cbiJdLCJzb3VyY2VSb290IjoiIn0=