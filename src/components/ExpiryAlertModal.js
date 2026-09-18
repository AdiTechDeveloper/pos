import { useEffect, useMemo, useState } from "react";

export default function ExpiryAlertModal({ open, onClose, alerts }) {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [query, setQuery] = useState("");

  // Close modal on ESC
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setSeverityFilter("all");
      setQuery("");
    }
  }, [open]);

  const counts = useMemo(() => {
    return {
      danger: alerts.filter((a) => a.severity === "danger").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      info: alerts.filter((a) => a.severity === "info").length,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => severityFilter === "all" || a.severity === severityFilter)
      .filter((a) =>
        query.trim()
          ? `${a.product_name} ${a.batch_no} ${a.branch_name}`
              .toLowerCase()
              .includes(query.toLowerCase())
          : true,
      )
      .sort((a, b) => {
        if (a.days_left < 0 && b.days_left >= 0) return -1;
        if (a.days_left >= 0 && b.days_left < 0) return 1;
        return a.days_left - b.days_left;
      });
  }, [alerts, severityFilter, query]);

  if (!open) return null;

  function SeverityBadge({ level, days }) {
    const map = {
      expired: "bg-red-200 text-red-800 border border-red-300",
      danger: "bg-red-100 text-red-700 border border-red-200",
      warning: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-lg font-semibold whitespace-nowrap ${map[level]}`}
      >
        {days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`}
      </span>
    );
  }

  const filterPills = [
    {
      key: "all",
      label: "All",
      count: alerts.length,
      color: "bg-gray-900 text-white",
    },
    {
      key: "expired",
      label: "Expired",
      count: alerts.filter((a) => a.severity === "expired").length,
      color: "bg-red-700 text-white",
    },
    {
      key: "danger",
      label: "Critical",
      count: alerts.filter((a) => a.severity === "danger").length,
      color: "bg-red-500 text-white",
    },
    {
      key: "warning",
      label: "Warning",
      count: alerts.filter((a) => a.severity === "warning").length,
      color: "bg-yellow-500 text-white",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl mx-4 h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b shrink-0">
          <div>
            <h2 className="text-4xl font-bold text-gray-800">
              Expiring Products
            </h2>
            <p className="text-lg text-gray-500 mt-2">
              Products nearing expiry across branches
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-3xl transition"
          >
            ×
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b shrink-0 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {filterPills.map((f) => (
              <button
                key={f.key}
                onClick={() => setSeverityFilter(f.key)}
                className={`px-4 py-2 rounded-full text-lg font-semibold transition ${
                  severityFilter === f.key
                    ? f.color
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label} · {f.count}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, batch, branch..."
            className="border rounded-xl px-4 py-2 text-lg w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6">
          {filteredAlerts.length === 0 ? (
            <div className="py-24 text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-green-600 font-semibold text-3xl">
                {alerts.length === 0
                  ? "No expiring products"
                  : "No matches found"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="text-lg text-gray-500 border-b">
                  <th className="px-4 py-3 text-left font-semibold">Product</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">Qty</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Branch
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredAlerts.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b last:border-b-0 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-xl text-gray-800">
                        {a.product_name}
                      </div>
                      <div className="text-lg text-gray-500 mt-1">
                        Batch: {a.batch_no}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center text-xl text-gray-700">
                      {new Date(a.expiry_date).toLocaleDateString("en-GB")}
                    </td>

                    <td className="px-4 py-4 text-center">
                      <SeverityBadge level={a.severity} days={a.days_left} />
                    </td>

                    <td
                      className={`px-4 py-4 text-center text-xl font-semibold ${
                        a.qty === 0 ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {a.qty}
                    </td>

                    <td className="px-4 py-4 text-center text-lg text-gray-600">
                      {a.branch_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center shrink-0 bg-white">
          <p className="text-lg text-gray-500">
            Showing {filteredAlerts.length} of {alerts.length} expiring items
          </p>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-xl font-semibold hover:bg-black transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
