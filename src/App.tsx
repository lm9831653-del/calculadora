import { useEffect, useMemo, useState } from "react";

type Entry = { id: number; qty: number; time: string };
type DayClose = {
  id: number;
  date: string;
  packages: number;
  shirts: number;
  money: number;
  price: number;
};

const OPTIONS = [1, 2, 3, 6, 10, 12, 20, 24, 30, 36, 48, 50, 100];
const KEY = "camisas-v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

const nowTime = () =>
  new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
const money = (n: number) =>
  n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function App() {
  const saved = useMemo(load, []);
  const [entries, setEntries] = useState<Entry[]>(saved?.entries ?? []);
  const [pending, setPending] = useState<number | null>(saved?.pending ?? null);
  const [price, setPrice] = useState<string>(saved?.price ?? "");
  const [history, setHistory] = useState<DayClose[]>(saved?.history ?? []);
  const [custom, setCustom] = useState<string>(saved?.custom ?? "");
  const [message, setMessage] = useState<string>(
    saved?.message ?? "Elige un paquete para empezar"
  );
  const [confirmClose, setConfirmClose] = useState<boolean>(saved?.confirmClose ?? false);
  const [flash, setFlash] = useState(false);

  const snapshot = JSON.stringify({
    entries,
    pending,
    price,
    history,
    custom,
    message,
    confirmClose,
  });

  // Guarda cada cambio al instante
  useEffect(() => {
    try {
      localStorage.setItem(KEY, snapshot);
      sessionStorage.setItem(KEY, snapshot);
    } catch {
      /* ignore */
    }
  }, [snapshot]);

  // Guarda también al salir / cambiar de pestaña / cerrar
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(KEY, snapshot);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", save);
    navigator.storage?.persist?.();
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, [snapshot]);

  const totalShirts = entries.reduce((s, e) => s + e.qty, 0);
  const priceNum = parseFloat(price) || 0;
  const pendingQty = pending ?? 0;
  const projected = totalShirts + pendingQty;

  const select = (q: number) => {
    if (pending === q) {
      setPending(null);
      setMessage("Selección quitada. Elige un paquete");
    } else {
      setPending(q);
      setMessage(`Anotado ${q} camisa${q > 1 ? "s" : ""} en rojo. Pulsa «Siguiente paquete» para sumarlo`);
    }
  };

  const addCustom = () => {
    const n = Math.floor(Number(custom));
    if (!n || n < 1) return;
    select(n);
    setCustom("");
  };

  const next = () => {
    if (pending === null) {
      setMessage("Primero elige una cantidad de camisas");
      return;
    }
    setEntries((e) => [{ id: Date.now(), qty: pending, time: nowTime() }, ...e]);
    setMessage(`✔ Se sumaron ${pending}. Elige otro paquete`);
    setPending(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  };

  const undo = () => {
    if (!entries.length) return;
    const [first, ...rest] = entries;
    setEntries(rest);
    setMessage(`Se quitó el paquete de ${first.qty}`);
  };

  const removeEntry = (id: number) => setEntries((e) => e.filter((x) => x.id !== id));

  const closeDay = () => {
    const all = pending ? [...entries, { id: 0, qty: pending, time: "" }] : entries;
    const shirts = all.reduce((s, e) => s + e.qty, 0);
    if (!shirts) {
      setConfirmClose(false);
      return;
    }
    setHistory((h) => [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString("es", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
        packages: all.length,
        shirts,
        money: shirts * priceNum,
        price: priceNum,
      },
      ...h,
    ]);
    setEntries([]);
    setPending(null);
    setConfirmClose(false);
    setMessage("Día cerrado y guardado. ¡Buen trabajo! Elige un paquete para empezar otro día");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👕</span>
            <div>
              <h1 className="text-lg font-bold leading-tight">Calculadora de camisas</h1>
              <p className="text-xs capitalize text-slate-400">
                {new Date().toLocaleDateString("es", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
          <span className="mr-2 hidden text-xs text-emerald-400 sm:inline">
            ● Guardado automático
          </span>
          <button
            onClick={() => setConfirmClose(true)}
            disabled={!projected}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300 disabled:opacity-40"
          >
            Cierre del día
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-5">
          {/* Mensaje */}
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              pending
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {message}
          </div>

          {/* Selección */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              1. Elige la cantidad del paquete
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {OPTIONS.map((q) => {
                const active = pending === q;
                return (
                  <button
                    key={q}
                    onClick={() => select(q)}
                    className={`relative rounded-2xl border-2 py-4 text-2xl font-extrabold transition active:scale-95 ${
                      active
                        ? "border-red-600 bg-red-500 text-white shadow-lg shadow-red-200"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {q}
                    <span
                      className={`block text-[10px] font-medium uppercase tracking-wider ${
                        active ? "text-red-100" : "text-slate-400"
                      }`}
                    >
                      {active ? "anotado" : q === 1 ? "camisa" : "camisas"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Otra cantidad…"
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
              <button
                onClick={addCustom}
                className="rounded-xl bg-slate-800 px-5 font-semibold text-white hover:bg-slate-700"
              >
                Anotar
              </button>
            </div>
            {pending !== null && !OPTIONS.includes(pending) && (
              <div className="mt-3 inline-block rounded-lg bg-red-500 px-3 py-1 text-sm font-bold text-white">
                {pending} anotadas
              </div>
            )}
          </div>

          {/* Siguiente */}
          <button
            onClick={next}
            className={`w-full rounded-2xl py-5 text-xl font-extrabold text-white shadow-lg transition active:scale-[0.98] ${
              pending
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-slate-400"
            }`}
          >
            {pending ? `Siguiente paquete  ➜  (sumar ${pending})` : "Siguiente paquete ➜"}
          </button>
        </section>

        <aside className="space-y-5">
          {/* Total */}
          <div
            className={`rounded-2xl bg-slate-900 p-5 text-white shadow-sm transition ${
              flash ? "scale-[1.02] ring-4 ring-emerald-400" : ""
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">Total del día</p>
            <p className="text-6xl font-black tabular-nums">{totalShirts}</p>
            <p className="text-sm text-slate-400">
              camisas en {entries.length} paquete{entries.length !== 1 && "s"}
            </p>
            {pending !== null && (
              <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">
                + {pending} pendiente (en rojo) → <b className="text-white">{projected}</b>
              </p>
            )}
            <div className="mt-4 border-t border-slate-700 pt-4">
              <label className="text-xs text-slate-400">Precio por camisa (opcional)</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              {priceNum > 0 && (
                <p className="mt-3 text-2xl font-bold text-amber-300">
                  $ {money(totalShirts * priceNum)}
                </p>
              )}
            </div>
          </div>

          {/* Registro */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Paquetes anotados
              </h2>
              <button
                onClick={undo}
                disabled={!entries.length}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-30"
              >
                ↩ Deshacer último
              </button>
            </div>
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Aún no hay paquetes</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-auto">
                {entries.map((e, i) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <span className="text-xs text-slate-400">
                      #{entries.length - i} · {e.time}
                    </span>
                    <span className="flex items-center gap-3">
                      <b className="text-lg">{e.qty}</b>
                      <button
                        onClick={() => removeEntry(e.id)}
                        className="text-slate-300 hover:text-red-500"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Historial */}
        {history.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Días cerrados
              </h2>
              <button
                onClick={() => confirm("¿Borrar todo el historial?") && setHistory([])}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                Borrar historial
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">{h.date}</p>
                    <p className="text-xs text-slate-400">{h.packages} paquetes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black">{h.shirts} 👕</p>
                    {h.money > 0 && (
                      <p className="text-xs font-semibold text-emerald-600">$ {money(h.money)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal cierre */}
      {confirmClose && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="text-4xl">🌙</p>
            <h3 className="mt-2 text-xl font-bold">¿Cerrar el día?</h3>
            <p className="mt-3 text-5xl font-black">{projected}</p>
            <p className="text-sm text-slate-500">
              camisas
              {priceNum > 0 && <> · $ {money(projected * priceNum)}</>}
            </p>
            {pending !== null && (
              <p className="mt-2 text-xs text-red-600">
                Se incluirá el paquete de {pending} que está en rojo.
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmClose(false)}
                className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={closeDay}
                className="flex-1 rounded-xl bg-slate-900 py-3 font-semibold text-white"
              >
                Cerrar día
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
