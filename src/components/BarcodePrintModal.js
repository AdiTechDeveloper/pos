import { useRef, useState } from "react";
import BarcodePrintSheet from "./BarcodePrintSheet";

const BarcodePrintModal = ({ product, onClose }) => {
  const [qty, setQty] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const content = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=600,height=700");

    printWindow.document.write(`
      <html>
        <head>
          <title>POS Barcode Print</title>
          <style>
            @page { margin: 0; size: 50mm 25mm; }
            body { margin: 0; padding: 0; }
            .sticker {
              width: 50mm;
              height: 25mm;
              display: flex;
              align-items: center;
              justify-content: center;
              page-break-after: always;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  if (!product) return null;

  return (
    <div style={styles.backdrop}>
      <div style={{ ...styles.modal, width: showPreview ? "600px" : "350px" }}>
        <h3 style={{ marginBottom: "15px" }}>Print Product Barcode</h3>

        <div style={styles.infoRow}>
          <p style={styles.productText}>
            Product: <span style={styles.productName}>{product.name}</span>
          </p>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={showPreview ? styles.btnModernActive : styles.btnModern}
          >
            <span
              style={{
                height: "8px",
                width: "8px",
                backgroundColor: showPreview ? "#28a745" : "#ccc",
                borderRadius: "50%",
                display: "inline-block",
                marginRight: "8px",
              }}
            ></span>
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>

        {showPreview && (
          <div style={styles.previewArea}>
            <p style={{ fontSize: "12px", color: "#666" }}>
              Preview (Scaling may vary from actual label)
            </p>
            <div style={styles.previewScroll}>
              {/* This maps the same logic as the print area so you see what you get */}
              {Array.from({ length: qty }).map((_, i) => (
                <div key={i} style={styles.previewSticker}>
                  <BarcodePrintSheet product={product} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ margin: "20px 0" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Quantity:
          </label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            style={styles.input}
          />
        </div>

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.btnCancel}>
            Cancel
          </button>
          <button onClick={handlePrint} style={styles.btnPrint}>
            Print Now
          </button>
        </div>

        {/* ACTUAL PRINT DATA (HIDDEN) */}
        <div style={{ display: "none" }}>
          <div ref={printRef}>
            {Array.from({ length: qty }).map((_, i) => (
              <div key={i} className="sticker">
                <BarcodePrintSheet product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    transition: "width 0.3s ease",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    padding: "10px 15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  productText: {
    margin: 0,
    fontSize: "14px",
    color: "#666",
  },
  productName: {
    color: "#333",
    fontWeight: "600",
  },
  btnModern: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: "20px",
    color: "#444",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  btnModernActive: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    backgroundColor: "#e9f5ec",
    border: "1px solid #28a745",
    borderRadius: "20px",
    color: "#28a745",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  previewArea: {
    backgroundColor: "#f8f9fa",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "15px",
    border: "1px solid #ddd",
  },
  previewScroll: {
    maxHeight: "250px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
  },
  previewSticker: {
    border: "1px dashed #ccc",
    width: "50mm",
    height: "25mm",
    backgroundColor: "white",
  },
  input: {
    padding: "10px",
    width: "80px",
    fontSize: "16px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    textAlign: "center",
  },
  actions: { display: "flex", justifyContent: "center", gap: "10px" },
  btnCancel: {
    padding: "10px 20px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    cursor: "pointer",
    backgroundColor: "#fff",
  },
  btnPrint: {
    padding: "10px 20px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#28a745",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default BarcodePrintModal;
