/* ===== Calculadora de camisas ===== */
(function () {
  "use strict";

  var OPTIONS = [1, 2, 3, 6, 10, 12, 20, 24, 30, 36, 48, 50, 100];

  // ---------- Estado (se recupera al abrir) ----------
  var saved = window.Storage2.load() || {};
  var state = {
    entries: saved.entries || [],
    pending: saved.pending || null,
    price: saved.price || "",
    history: saved.history || [],
    custom: saved.custom || "",
    message: saved.message || "Elige un paquete para empezar",
    confirmClose: !!saved.confirmClose,
  };

  // ---------- Utilidades ----------
  var $ = function (id) {
    return document.getElementById(id);
  };
  var nowTime = function () {
    return new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  };
  var fmtMoney = function (n) {
    return n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var plural = function (n, one, many) {
    return n === 1 ? one : many;
  };
  var totalShirts = function () {
    return state.entries.reduce(function (s, e) {
      return s + e.qty;
    }, 0);
  };
  var priceNum = function () {
    return parseFloat(state.price) || 0;
  };
  var persist = function () {
    window.Storage2.save(state);
  };

  // ---------- Acciones ----------
  function select(q) {
    if (state.pending === q) {
      state.pending = null;
      state.message = "Selección quitada. Elige un paquete";
    } else {
      state.pending = q;
      state.message =
        "Anotado " + q + " " + plural(q, "camisa", "camisas") +
        " en rojo. Pulsa «Siguiente paquete» para sumarlo";
    }
    render();
  }

  function addCustom() {
    var n = Math.floor(Number($("custom-input").value));
    if (!n || n < 1) return;
    state.custom = "";
    $("custom-input").value = "";
    select(n);
  }

  function next() {
    if (state.pending === null) {
      state.message = "Primero elige una cantidad de camisas";
      render();
      return;
    }
    state.entries.unshift({ id: Date.now(), qty: state.pending, time: nowTime() });
    state.message = "✔ Se sumaron " + state.pending + ". Elige otro paquete";
    state.pending = null;
    render();
    var card = $("total-card");
    card.classList.add("flash");
    setTimeout(function () {
      card.classList.remove("flash");
    }, 500);
  }

  function undo() {
    if (!state.entries.length) return;
    var first = state.entries.shift();
    state.message = "Se quitó el paquete de " + first.qty;
    render();
  }

  function removeEntry(id) {
    state.entries = state.entries.filter(function (e) {
      return e.id !== id;
    });
    render();
  }

  function closeDay() {
    var all = state.entries.slice();
    if (state.pending) all.push({ qty: state.pending });
    var shirts = all.reduce(function (s, e) {
      return s + e.qty;
    }, 0);
    state.confirmClose = false;
    if (!shirts) return render();

    state.history.unshift({
      id: Date.now(),
      date: new Date().toLocaleDateString("es", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      packages: all.length,
      shirts: shirts,
      money: shirts * priceNum(),
    });
    state.entries = [];
    state.pending = null;
    state.message =
      "Día cerrado y guardado. ¡Buen trabajo! Elige un paquete para empezar otro día";
    render();
  }

  // ---------- Dibujar pantalla ----------
  function render() {
    var total = totalShirts();
    var pend = state.pending || 0;
    var projected = total + pend;
    var price = priceNum();

    $("today").textContent = new Date().toLocaleDateString("es", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    // Mensaje
    var msg = $("message");
    msg.textContent = state.message;
    msg.className = "message" + (state.pending ? " is-red" : "");

    // Botones de cantidad
    var opts = $("options");
    opts.innerHTML = "";
    OPTIONS.forEach(function (q) {
      var b = document.createElement("button");
      var active = state.pending === q;
      b.className = "option" + (active ? " is-red" : "");
      b.innerHTML =
        q + "<small>" + (active ? "anotado" : plural(q, "camisa", "camisas")) + "</small>";
      b.onclick = function () {
        select(q);
      };
      opts.appendChild(b);
    });

    // Cantidad personalizada anotada
    var badge = $("custom-badge");
    if (state.pending !== null && OPTIONS.indexOf(state.pending) === -1) {
      badge.hidden = false;
      badge.textContent = state.pending + " anotadas";
    } else {
      badge.hidden = true;
    }

    // Botón siguiente
    var nextBtn = $("btn-next");
    nextBtn.className = "btn-next" + (state.pending ? " is-ready" : "");
    nextBtn.textContent = state.pending
      ? "Siguiente paquete  ➜  (sumar " + state.pending + ")"
      : "Siguiente paquete ➜";

    // Total
    $("total-shirts").textContent = total;
    $("total-info").textContent =
      "camisas en " + state.entries.length + " " +
      plural(state.entries.length, "paquete", "paquetes");

    var pi = $("pending-info");
    if (state.pending !== null) {
      pi.hidden = false;
      pi.innerHTML = "+ " + state.pending + " pendiente (en rojo) → <b>" + projected + "</b>";
    } else {
      pi.hidden = true;
    }

    var moneyEl = $("money");
    if (price > 0) {
      moneyEl.hidden = false;
      moneyEl.textContent = "$ " + fmtMoney(total * price);
    } else {
      moneyEl.hidden = true;
    }

    // Lista de paquetes
    var list = $("entries");
    list.innerHTML = "";
    if (!state.entries.length) {
      list.innerHTML = '<li class="empty">Aún no hay paquetes</li>';
    } else {
      state.entries.forEach(function (e, i) {
        var li = document.createElement("li");
        li.className = "entry";
        li.innerHTML =
          '<span class="entry__meta">#' + (state.entries.length - i) + " · " + e.time + "</span>" +
          '<span class="entry__right"><b class="entry__qty">' + e.qty + "</b></span>";
        var del = document.createElement("button");
        del.className = "entry__del";
        del.textContent = "✕";
        del.title = "Eliminar";
        del.onclick = function () {
          removeEntry(e.id);
        };
        li.querySelector(".entry__right").appendChild(del);
        list.appendChild(li);
      });
    }
    $("btn-undo").disabled = !state.entries.length;
    $("btn-close-day").disabled = !projected;

    // Historial
    $("history-card").hidden = !state.history.length;
    var hist = $("history");
    hist.innerHTML = "";
    state.history.forEach(function (h) {
      var d = document.createElement("div");
      d.className = "day";
      d.innerHTML =
        "<div>" +
          '<p class="day__date">' + h.date + "</p>" +
          '<p class="day__pk">' + h.packages + " paquetes</p>" +
        "</div>" +
        '<div class="day__right">' +
          '<p class="day__shirts">' + h.shirts + " 👕</p>" +
          (h.money > 0 ? '<p class="day__money">$ ' + fmtMoney(h.money) + "</p>" : "") +
        "</div>";
      hist.appendChild(d);
    });

    // Ventana de cierre
    $("modal").hidden = !state.confirmClose;
    $("modal-total").textContent = projected;
    $("modal-sub").textContent =
      "camisas" + (price > 0 ? " · $ " + fmtMoney(projected * price) : "");
    var mp = $("modal-pending");
    if (state.pending !== null) {
      mp.hidden = false;
      mp.textContent = "Se incluirá el paquete de " + state.pending + " que está en rojo.";
    } else {
      mp.hidden = true;
    }

    // Campos de texto (sin pisar lo que se está escribiendo)
    if ($("price").value !== state.price) $("price").value = state.price;
    if ($("custom-input").value !== state.custom) $("custom-input").value = state.custom;

    persist();
  }

  // ---------- Eventos ----------
  $("btn-custom").onclick = addCustom;
  $("custom-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") addCustom();
  });
  $("custom-input").addEventListener("input", function (e) {
    state.custom = e.target.value;
    persist();
  });
  $("price").addEventListener("input", function (e) {
    state.price = e.target.value;
    render();
  });
  $("btn-next").onclick = next;
  $("btn-undo").onclick = undo;
  $("btn-close-day").onclick = function () {
    state.confirmClose = true;
    render();
  };
  $("btn-cancel").onclick = function () {
    state.confirmClose = false;
    render();
  };
  $("btn-confirm").onclick = closeDay;
  $("btn-clear-history").onclick = function () {
    if (confirm("¿Borrar todo el historial?")) {
      state.history = [];
      render();
    }
  };

  // Guardar también al salir o cambiar de pestaña
  window.addEventListener("pagehide", persist);
  window.addEventListener("beforeunload", persist);
  document.addEventListener("visibilitychange", persist);
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

  render();
})();
