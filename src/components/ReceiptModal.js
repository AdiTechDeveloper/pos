import React, { forwardRef } from "react";

const ReceiptModal = forwardRef(
  ({ isOpen, onClose, data = {}, onPrint }, ref) => {
    if (!isOpen || !data?.data?.length) return null;

    const billData = data.data[0] || {};
    const {
      store,
      branch,
      customer,
      bill,
      items = [],
      barcode,
      footer,
    } = billData;

    const format = (v) => Number(v || 0).toFixed(2);

    const formatDateTime = (dateStr) => {
      const d = new Date(dateStr || new Date());

      const pad = (n) => String(n).padStart(2, "0");

      return (
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      );
    };

    // Check if any item has a price override
    const hasAnyOverride = items.some((item) => item.is_price_overridden);

    const metaRows = [
      ["Bill No", bill?.number],
      ["Date", bill?.date],
      ["Cashier", bill?.cashier || "-"],
    ];

    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div ref={ref} style={styles.receiptBox}>
            {/* ================= HEADER ================= */}
            <div style={styles.center}>
              <div style={styles.storeName}>{store?.name || "STORE NAME"}</div>
              <div>{store?.company}</div>
              <div>{branch?.address}</div>
              <div>Phone: {store?.phone}</div>
              {store?.gst && <div>GST: {store?.gst}</div>}
            </div>
            <div style={styles.dash} />
            <div style={styles.taxInvoice}>Tax Invoice</div>
            <div style={styles.dash} />

            <div>Customer Name: {customer?.name}</div>
            <div>Customer Mobile No: {customer?.mobile}</div>

            {/* ================= SAVINGS ================= */}
            {bill?.total_saved > 0 && (
              <div style={styles.savedBanner}>
                You have saved Rs.{format(bill?.total_saved)}
              </div>
            )}
            <div style={styles.dash} />
            {/* ================= META ================= */}
            {metaRows.map(([k, v], i) => (
              <div key={i} style={styles.row}>
                <span>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div style={styles.dash} />
            {/* ================= ITEMS ================= */}
            <div style={styles.tableHeader}>
              <span style={{ flex: 2 }}>Item</span>
              <span style={{ flex: 1 }}>MRP</span>
              <span style={{ flex: 1 }}>Gross</span>
              <span style={{ flex: 1, textAlign: "center" }}>Qty</span>
              <span style={{ flex: 1, textAlign: "right" }}>Amt</span>
            </div>
            <div style={styles.dash} />
            {items.map((item, i) => (
              <div key={i} style={styles.itemRow}>
                <span style={{ flex: 2 }}>{item.name ?? ""}</span>
                <span style={{ flex: 1 }}>{item.mrp ?? ""}</span>
                <span style={{ flex: 1 }}>{format(item.selling ?? "")}</span>
                <span style={{ flex: 1, textAlign: "center" }}>
                  {item.qty ?? ""}
                </span>
                <span style={{ flex: 1, textAlign: "right" }}>
                  {format(item.amount) ?? ""}
                </span>

                {/* Price override note — only shown if overridden */}
                {item.is_price_overridden && (
                  <div style={styles.overrideNote}>
                    * Price: ₹{format(item.original_price)} → ₹
                    {format(item.selling)}
                  </div>
                )}
              </div>
            ))}
            <div style={styles.dash} />
            {/* ================= TOTALS ================= */}
            <div style={styles.row}>
              <span>Gross</span>
              <span>{format(bill?.subtotal)}</span>
            </div>
            <div style={styles.row}>
              <span>Taxable</span>
              <span>{format(bill?.subtotal - bill?.total_gst)}</span>
            </div>
            <div style={styles.row}>
              <span>GST</span>
              <span>{format(bill?.total_gst)}</span>
            </div>
            <div style={{ ...styles.row, fontWeight: "bold", fontSize: 16 }}>
              <span>Total</span>
              <span>{format(bill?.total_amount)}</span>
            </div>
            <div style={styles.dash} />
            {/* PRICE OVERRIDE SUMMARY ── only shown if any override exists */}
            {hasAnyOverride && (
              <>
                <div style={styles.overrideSummaryBox}>
                  <div style={styles.overrideSummaryTitle}>
                    * Special Price Applied
                  </div>
                  {items
                    .filter((item) => item.is_price_overridden)
                    .map((item, i) => (
                      <div key={i} style={styles.overrideSummaryRow}>
                        <span style={{ flex: 2 }}>{item.name ?? ""}</span>
                        <span
                          style={{
                            flex: 1,
                            textDecoration: "line-through",
                            color: "#999",
                          }}
                        >
                          ₹{format(item.original_price)}
                        </span>
                        <span style={{ flex: 1, textAlign: "right" }}>
                          ₹{format(item.selling)}
                        </span>
                      </div>
                    ))}
                </div>
                <div style={styles.dash} />
              </>
            )}
            {/* ================= GST BREAKUP ================= */}
            <div style={styles.sectionTitle}>GST Breakup</div>
            <div style={styles.row}>
              <span>CGST</span>
              <span>{format(bill?.cgst_total)}</span>
            </div>
            <div style={styles.row}>
              <span>SGST</span>
              <span>{format(bill?.sgst_total)}</span>
            </div>
            <div style={styles.row}>
              <span>CESS</span>
              <span>{format(bill?.cess)}</span>
            </div>
            <div style={styles.dash} />
            {/* ================= BARCODE ================= */}
            {barcode && (
              <div>
                <img
                  style={{ ...styles.center, height: 70 }}
                  src={barcode}
                  alt="barcode"
                />
              </div>
            )}
            {/* ================= FOOTER ================= */}
            <div style={styles.footer}>
              {(footer || "Thank you for shopping with us")
                .split("\n")
                .map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
            </div>
          </div>

          {/* ================= ACTIONS ================= */}
          <div style={styles.actions}>
            <button onClick={onPrint} style={styles.printBtn}>
              Print
            </button>
            <button onClick={onClose} style={styles.closeBtn}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default ReceiptModal;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },

  modal: {
    background: "#fff",
    padding: 15,
    borderRadius: 6,
    width: 320,
    maxHeight: "90vh",
    overflowY: "auto",
  },

  receiptBox: {
    width: 280,
    margin: "0 auto",
    fontFamily: "Courier New, monospace",
    fontSize: 13,
    color: "#000",
  },

  center: {
    textAlign: "center",
  },

  storeName: {
    fontWeight: "bold",
    fontSize: 18,
  },

  dash: {
    borderTop: "1px dashed #000",
    margin: "6px 0",
  },

  savedBanner: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    margin: "2px 0",
  },

  tableHeader: {
    display: "flex",
    fontWeight: "bold",
  },

  itemRow: {
    display: "flex",
    margin: "2px 0",
  },

  overrideNote: {
    fontSize: 11,
    color: "#555",
    marginLeft: 2,
    marginBottom: 3,
    fontStyle: "italic",
  },

  overrideSummaryBox: {
    marginBottom: 4,
  },
  overrideSummaryTitle: {
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 3,
    textAlign: "center",
  },
  overrideSummaryRow: {
    display: "flex",
    fontSize: 11,
    margin: "2px 0",
  },

  sectionTitle: {
    textAlign: "center",
    fontWeight: "bold",
  },

  footer: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 12,
  },

  actions: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
  },

  printBtn: {
    padding: "10px 18px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },

  closeBtn: {
    padding: "10px 18px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },

  taxInvoice: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 6,
  },
};
