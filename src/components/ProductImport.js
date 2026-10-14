
import React, { useRef, useState } from "react";
import axios from "axios";

/**
 * Bulk product import from Excel.
 *
 * Usage (inside your Products page):
 *
 * const { invalidate, loadProducts } = useAppData();
 *
 * <ProductImport
 *   onImported={() => {
 *     invalidate("products");
 *     loadProducts({ force: true });
 *   }}
 * />
 */

const MAX_SIZE_MB = 10;

const styles = {
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#fff",
    width: "100%",
    marginBottom: 20,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  hint: {
    margin: "6px 0 14px",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  btn: {
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  primary: {
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    border: 0,
    background: "#4f46e5",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  file: {
    fontSize: 13,
    color: "#374151",
  },
  result: {
    marginTop: 14,
    fontSize: 14,
  },
  errors: {
    marginTop: 8,
    maxHeight: 240,
    overflow: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
  },
  errRow: {
    padding: "8px 12px",
    fontSize: 13,
    borderBottom: "1px solid #f1f1f4",
  },
};

export default function ProductImport({ onImported }) {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);


  const downloadTemplate = async () => {
    setMessage("");

    try {
      const res = await axios.get(
        `${BASE_URL}/api/products/import-template`,
        {
          responseType: "blob",
        }
      );

      // Check whether the server returned an error instead of Excel
      const contentType = res.headers["content-type"] || "";

      if (
        contentType.includes("application/json") ||
        contentType.includes("text/html")
      ) {
        const errorText = await res.data.text();

        let errorMessage = "The server did not return an Excel template.";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Keep the default error message
        }

        throw new Error(errorMessage);
      }

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "product-import-template.xlsx";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
    } catch (error) {
      console.error("Product template download error:", error);

      setMessage(
        error.message ||
        error.response?.data?.message ||
        "Unable to download the template. Please try again."
      );
    }
  };

  const pickFile = (event) => {
    const picked = event.target.files?.[0] || null;

    setResult(null);
    setMessage("");

    if (picked && picked.size > MAX_SIZE_MB * 1024 * 1024) {
      setFile(null);

      setMessage(
        `The file must be smaller than ${MAX_SIZE_MB} MB.`
      );

      return;
    }

    setFile(picked);
  };

  const upload = async () => {
    if (!file || busy) return;

    const form = new FormData();
    form.append("file", file);

    setBusy(true);
    setMessage("");
    setResult(null);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/products/import`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(res.data);
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      if (res.data?.summary?.created > 0) {
        onImported?.(res.data);
      }
    } catch (err) {
      const data = err.response?.data;

      setMessage(
        data?.errors?.file?.[0] ||
        data?.message ||
        "Import failed. Please check your file and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const summary = result?.summary;
  const errors = result?.errors || [];

  return (
    <div style={styles.box}>
      <h3 style={styles.title}>
        Import Products from Excel
      </h3>

      <p style={styles.hint}>
        1) Download the template. 2) Fill in the product
        details. Only the <b>name</b> field is required.
        If the barcode is left blank, it will be generated
        automatically. 3) Upload the completed file.
        You can import up to 2,000 products at a time.
      </p>

      <div style={styles.row}>
        <button
          type="button"
          style={styles.btn}
          onClick={downloadTemplate}
          disabled={busy}
        >
          ↓ Download Template
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={pickFile}
          disabled={busy}
          style={styles.file}
        />

        <button
          type="button"
          style={{
            ...styles.primary,
            opacity: !file || busy ? 0.5 : 1,
            cursor:
              !file || busy ? "not-allowed" : "pointer",
          }}
          disabled={!file || busy}
          onClick={upload}
        >
          {busy ? "Importing..." : "Import Products"}
        </button>
      </div>

      {message && (
        <div
          style={{
            ...styles.result,
            color: "#b45309",
          }}
        >
          {message}
        </div>
      )}

      {summary && (
        <div style={styles.result}>
          <div>
            <b>{summary.created}</b> products created,{" "}
            <b>{summary.skipped}</b> skipped out of{" "}
            <b>{summary.total_rows}</b> rows.
          </div>

          {errors.length > 0 && (
            <div style={styles.errors}>
              {errors.map((item, index) => (
                <div
                  key={`${item.row}-${index}`}
                  style={styles.errRow}
                >
                  <b>Row {item.row}</b>
                  {item.name ? ` (${item.name})` : ""}:{" "}
                  {(item.errors || []).join(", ")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
