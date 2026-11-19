import React, { useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
  title: { margin: 0, fontSize: 16, fontWeight: 600 },
  hint: {
    margin: "6px 0 14px",
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  row: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  btn: {
    height: 36, padding: "0 14px", borderRadius: 8,
    border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer",
  },
  primary: {
    height: 36, padding: "0 14px", borderRadius: 8, border: 0,
    background: "#4f46e5", color: "#fff", fontSize: 14,
    fontWeight: 600, cursor: "pointer",
  },
  file: { fontSize: 13, color: "#374151" },
  result: { marginTop: 14, fontSize: 14 },
  summary: {
    display: "flex", flexWrap: "wrap", gap: 16, padding: 12,
    border: "1px solid #e5e7eb", borderRadius: 8, background: "#f9fafb",
  },
  errors: {
    marginTop: 10, maxHeight: 320, overflow: "auto",
    border: "1px solid #fecaca", borderRadius: 8, background: "#fff",
  },
  errRow: {
    padding: "9px 12px", fontSize: 13,
    borderBottom: "1px solid #fee2e2", color: "#991b1b", lineHeight: 1.5,
  },
  errorHeading: { margin: "14px 0 0", fontSize: 14, fontWeight: 600, color: "#991b1b" },
};

export default function ProductImport({ onImported }) {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const downloadTemplate = async () => {
    setMessage("");
    try {
      const res = await axios.get(`${BASE_URL}/api/products/import-template`, {
        responseType: "blob",
      });

      const contentType = res.headers["content-type"] || "";
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        const errorText = await res.data.text();
        let errorMessage = "The server did not return an Excel template.";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {}
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
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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
      event.target.value = "";
      setMessage(`The file must be smaller than ${MAX_SIZE_MB} MB.`);
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
      // Original working Axios request is intentionally preserved.
      const res = await axios.post(
        `${BASE_URL}/api/products/import`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = res.data || {};
      const summary = data.summary || {};
      const rowErrors = Array.isArray(data.errors) ? data.errors : [];
      const created = Number(summary.created || 0);
      const skipped = Number(summary.skipped || 0);
      const totalRows = Number(summary.total_rows || 0);

      setResult(data);

      // Refresh products if at least some rows were created, even if
      // other rows failed. Do not navigate on a partial/failed import.
      if (created > 0 && onImported) {
        await onImported(data);
      }

      // API can return HTTP 200 and status:true even if all rows were skipped.
      if (
        data.status === false ||
        skipped > 0 ||
        rowErrors.length > 0 ||
        created === 0
      ) {
        setMessage(
          data.message ||
          (created === 0
            ? "No products were imported. Please check the row-wise errors below."
            : "Import completed with errors. Please check the skipped rows below.")
        );
        return;
      }

      // Redirect only when the import has no skipped rows or errors.
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setMessage(`Successfully imported ${created} products out of ${totalRows} rows.`);
      navigate("/product");
    } catch (err) {
      console.error("Product Excel import error:", err);
      const data = err.response?.data;

      if (data) setResult(data);

      const validationErrors = data?.errors;
      const firstValidationError = validationErrors
        ? Array.isArray(validationErrors)
          ? validationErrors[0]?.errors?.[0] || validationErrors[0]?.message
          : Object.values(validationErrors).flat()?.[0]
        : null;

      setMessage(
        firstValidationError ||
        data?.message ||
        err.message ||
        "Import failed. Please check your file and try again."
      );
      // Keep the selected file and stay on this page.
    } finally {
      setBusy(false);
    }
  };

  const summary = result?.summary;
  const errors = Array.isArray(result?.errors) ? result.errors : [];

  return (
    <div style={styles.box}>
      <h3 style={styles.title}>Import Products from Excel</h3>

      <p style={styles.hint}>
        1) Download the template.
        <br />
        2) Fill in the supplier details. (The <b>name</b> and <b>state</b> fields are
        required. If a valid GSTIN is provided, the state will be detected automatically)
        <br />
        3) Upload the complete file, You can import up to <b>2,000</b> suppliers at a time.
      </p>

      <div style={styles.row}>
        <button type="button" style={styles.btn} onClick={downloadTemplate} disabled={busy}>
          ↓ Download Sample Template
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
            cursor: !file || busy ? "not-allowed" : "pointer",
          }}
          disabled={!file || busy}
          onClick={upload}
        >
          {busy ? "Importing..." : "Import Products"}
        </button>
      </div>

      {file && (
        <div style={{ ...styles.result, color: "#374151" }}>
          Selected file: <b>{file.name}</b>
        </div>
      )}

      {message && (
        <div
          role="alert"
          style={{
            ...styles.result,
            padding: 10,
            border: "1px solid #fecaca",
            borderRadius: 8,
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {message}
        </div>
      )}

      {summary && (
        <div style={styles.result}>
          <div style={styles.summary}>
            <div><b>{summary.created ?? 0}</b> products created</div>
            <div><b>{summary.skipped ?? 0}</b> skipped</div>
            <div><b>{summary.total_rows ?? 0}</b> total rows</div>
          </div>

          {errors.length > 0 && (
            <>
              <h4 style={styles.errorHeading}>Import errors ({errors.length})</h4>
              <div style={styles.errors}>
                {errors.map((item, index) => (
                  <div key={`${item.row ?? index}-${index}`} style={styles.errRow}>
                    <b>Row {item.row ?? index + 1}</b>
                    {item.name ? ` (${item.name})` : ""}:{" "}
                    {(
                      Array.isArray(item.errors)
                        ? item.errors
                        : [item.message || item.error || "Import error"]
                    ).join(", ")}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
