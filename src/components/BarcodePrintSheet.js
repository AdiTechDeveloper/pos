import React, { forwardRef } from "react";
import Barcode from "react-barcode";

const BarcodePrintSheet = forwardRef(({ product }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1mm",
        boxSizing: "border-box",
        backgroundColor: "white",
      }}
    >
      {/* Product Name */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          marginBottom: "2px",
          textAlign: "center",
          width: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {product?.name}
      </div>

      {/* Barcode Element */}
      <Barcode
        value={product?.barcode || product?.sku || "0000"}
        width={1}
        height={40}
        renderer="svg"
        displayValue={true}
        fontSize={10}
        margin={0}
      />

      {/* Footer Info Container */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "2px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Row 1: SKU & Price spaced out evenly */}
        <div
          style={{
            fontSize: "8.5px",
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            color: "#333",
            fontWeight: "500",
          }}
        >
          <span>SKU: {product?.sku}</span>
          <span>MRP: ₹{product?.mrp}</span>
        </div>

        {/* Row 2: Customer Attractive, Bold LM Price Centered */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: "800", // Extra bold
            textAlign: "center",
            width: "100%",
            marginTop: "1px",
            color: "#000", // Solid deep contrast black for thermal printers
            letterSpacing: "0.2px",
          }}
        >
          Loyaaliti Price: ₹{product?.selling_price}
        </div>
      </div>
    </div>
  );
});

export default BarcodePrintSheet;
