import React, { useRef } from "react";
import BarcodePrintSheet from "./BarcodePrintSheet";

const BarcodePrintWrapper = ({ isOpen, product, qty }) => {
  const printRef = useRef(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const content = printRef.current.innerHTML;
    const printWindow = window.open("", "", "width=500,height=600");

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Labels</title>
            <style>
                @page { 
                margin: 0; 
                size: 50mm 25mm; /* FORCE the page size here */
                }
                body { 
                margin: 0; 
                padding: 0; 
                width: 50mm; 
                height: 25mm;
                }
                .sticker {
                width: 50mm;
                height: 25mm;
                page-break-after: always;
                display: flex;
                align-items: center;
                justify-content: center;
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

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={{ display: "none" }}>
          <div ref={printRef}>
            {Array.from({ length: qty }).map((_, i) => (
              <div key={i} className="sticker">
                <BarcodePrintSheet product={product} qty={1} />
              </div>
            ))}
          </div>
        </div>

        <h3>Confirm Print</h3>
        <p>
          Printing {qty} stickers for: <strong>{product?.name}</strong>
        </p>

        <div style={styles.actions}>
          <button onClick={handlePrint} style={styles.printBtn}>
            Print Stickers
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    textAlign: "center",
  },
  printBtn: {
    padding: "10px 20px",
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default BarcodePrintWrapper;
