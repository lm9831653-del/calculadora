/* ===== Guardado automático (localStorage) ===== */
(function () {
  var KEY = "camisas-v1";

  window.Storage2 = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    save: function (state) {
      var json = JSON.stringify(state);
      try {
        localStorage.setItem(KEY, json);
        sessionStorage.setItem(KEY, json);
      } catch (e) {
        /* ignorar */
      }
    },
  };
})();
