import React, { useRef } from "react";
import ReceiptModal from "./ReceiptModal";

const PosPrintWrapper = ({ isOpen, onClose, data }) => {
  const receiptRef = useRef(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    // Get ONLY receipt HTML
    const receiptHTML = receiptRef.current.innerHTML;

    // Create print window
    const printWindow = window.open("", "", "width=380,height=600");

    printWindow.document.write(`
        <html>
            <head>
            <title>POS Receipt</title>
            <style>
                /* This part tells the printer to stop exactly at the content end */
                @page {
                margin: 0;
                }
                body {
                margin: 0;
                padding: 5px; /* Tiny bit of breathing room */
                width: 80mm;
                font-family: "Courier New", monospace;
                font-size: 12px;
                }
                * {
                box-sizing: border-box;
                }
                hr {
                border: none;
                border-top: 1px dashed #000;
                margin: 5px 0;
                }
            </style>
            </head>
            <body>
            ${receiptHTML}
            </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Print ONLY this content
    printWindow.print();
    printWindow.close();
  };

  return (
    <ReceiptModal
      isOpen={isOpen}
      onClose={onClose}
      data={data}
      ref={receiptRef}
      onPrint={handlePrint}
    />
  );
};

export default PosPrintWrapper;
