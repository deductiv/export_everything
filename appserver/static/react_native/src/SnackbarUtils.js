class SnackbarUtils {
    #snackBar = {
      enqueueSnackbar: ()=>{},
      closeSnackbar: () => {},
    };
  
    setSnackBar(enqueueSnackbar, closeSnackbar) {
      this.#snackBar.enqueueSnackbar = enqueueSnackbar;
      this.#snackBar.closeSnackbar = closeSnackbar;
    }
  
    success(msg, options = {}) {
      return this.toast(msg, { ...options, variant: "success" });
    }
    warning(msg, options = {}) {
      return this.toast(msg, { ...options, variant: "warning" });
    }
    info(msg, options = {}) {
      return this.toast(msg, { ...options, variant: "info" });
    }
  
    error(msg, options = {}) {
      return this.toast(msg, { ...options, variant: "error" });
    }
    toast(msg, options = {}) {
      const finalOptions = {
        variant: "default",
        ...options,
      };
      return this.#snackBar.enqueueSnackbar(msg, { ...finalOptions });
    }
    closeSnackbar(key) {
      this.#snackBar.closeSnackbar(key);
    }
  }
  
  export default new SnackbarUtils();