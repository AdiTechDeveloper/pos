import React, { useRef, useState } from "react";
import axios from "axios";
import Layout from "./layout";

/**
 * Bulk Images & Details
 *  1) Excel: saare products download karo, description / details bharo, upload karo.
 *  2) ZIP:   SKU.jpg, SKU_2.jpg ... SKU_4.jpg naam ki photos ek ZIP me upload karo.
 */

const MAX_EXCEL_MB = 10;
const MAX_ZIP_MB = 50;

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
  hint: { margin: "6px 0 14px", fontSize: 13, color: "#6b7280", lineHeight: 1.6 },
  row: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
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
  file: { fontSize: 13, color: "#374151" },
  alert: {
    marginTop: 14,
    padding: 10,
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#991b1b",
    fontSize: 14,
  },
  summary: {
    marginTop: 14,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    padding: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#f9fafb",
    fontSize: 14,
  },
  errors: {
    marginTop: 10,
    maxHeight: 320,
    overflow: "auto",
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fff",
  },
  errRow: {
    padding: "9px 12px",
    fontSize: 13,
    borderBottom: "1px solid #fee2e2",
    color: "#991b1b",
    lineHeight: 1.5,
  },
  errHeading: { margin: "14px 0 0", fontSize: 14, fontWeight: 600, color: "#991b1b" },
};

const apiErrorMessage = (err, fallback) => {
  const data = err.response?.data;
  const validation = data?.errors
    ? Object.values(data.errors).flat()?.[0]
    : null;
  return validation || data?.message || err.message || fallback;
};

export default function ProductBulkDetails() {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // ---- Excel
  const excelRef = useRef(null);
  const [excelFile, setExcelFile] = useState(null);
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelMsg, setExcelMsg] = useState("");
  const [excelResult, setExcelResult] = useState(null);

  // ---- ZIP
  const zipRef = useRef(null);
  const [zipFile, setZipFile] = useState(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipMsg, setZipMsg] = useState("");
  const [zipResult, setZipResult] = useState(null);

  const downloadExcel = async () => {
    setExcelMsg("");
    try {
      const res = await axios.get(`${BASE_URL}/api/products/bulk-details-template`, {
        responseType: "blob",
      });

      const contentType = res.headers["content-type"] || "";
      if (contentType.includes("application/json") || contentType.includes("text/html")) {
        let message = "The server did not return an Excel file.";
        try {
          message = JSON.parse(await res.data.text()).message || message;
        } catch {}
        throw new Error(message);
      }

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-details.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setExcelMsg(err.message || "Unable to download the Excel file. Please try again.");
    }
  };

  const pickExcel = (e) => {
    const picked = e.target.files?.[0] || null;
    setExcelResult(null);
    setExcelMsg("");
    if (picked && picked.size > MAX_EXCEL_MB * 1024 * 1024) {
      setExcelFile(null);
      e.target.value = "";
      setExcelMsg(`The file must be smaller than ${MAX_EXCEL_MB} MB.`);
      return;
    }
    setExcelFile(picked);
  };

  const uploadExcel = async () => {
    if (!excelFile || excelBusy) return;
    const form = new FormData();
    form.append("file", excelFile);

    setExcelBusy(true);
    setExcelMsg("");
    setExcelResult(null);
    try {
      const res = await axios.post(`${BASE_URL}/api/products/bulk-details`, form);
      setExcelResult(res.data);
      if ((res.data?.summary?.failed || 0) === 0) {
        setExcelFile(null);
        if (excelRef.current) excelRef.current.value = "";
      }
    } catch (err) {
      setExcelMsg(apiErrorMessage(err, "Upload failed. Please check your file and try again."));
    } finally {
      setExcelBusy(false);
    }
  };

  const pickZip = (e) => {
    const picked = e.target.files?.[0] || null;
    setZipResult(null);
    setZipMsg("");
    if (picked && picked.size > MAX_ZIP_MB * 1024 * 1024) {
      setZipFile(null);
      e.target.value = "";
      setZipMsg(`The ZIP must be smaller than ${MAX_ZIP_MB} MB.`);
      return;
    }
    setZipFile(picked);
  };

  const uploadZip = async () => {
    if (!zipFile || zipBusy) return;
    const form = new FormData();
    form.append("file", zipFile);

    setZipBusy(true);
    setZipMsg("");
    setZipResult(null);
    try {
      const res = await axios.post(`${BASE_URL}/api/products/bulk-images`, form);
      setZipResult(res.data);
      setZipFile(null);
      if (zipRef.current) zipRef.current.value = "";
    } catch (err) {
      setZipMsg(apiErrorMessage(err, "Upload failed. Please check your ZIP and try again."));
    } finally {
      setZipBusy(false);
    }
  };

  const excelSummary = excelResult?.summary;
  const excelErrors = Array.isArray(excelResult?.errors) ? excelResult.errors : [];
  const zipSummary = zipResult?.summary;
  const zipProblems = (Array.isArray(zipResult?.results) ? zipResult.results : []).filter(
    (r) => r.status !== "updated"
  );

  const disabledStyle = (disabled) => ({
    ...styles.primary,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">Bulk Images &amp; Details</h3>

          {/* ---------------- Excel ---------------- */}
          <div style={styles.box}>
            <h3 style={styles.title}>1. Description &amp; product details (Excel)</h3>
            <p style={styles.hint}>
              1) Download the Excel. It contains all your products with their current details.
              <br />
              2) Fill the <b>description</b> and the detail columns (Unit, Shelf Life, Storage Tips,
              Ingredients, Nutrition Information ...). Do not change <b>product_id</b>.
              <br />
              3) Upload the file. <b>Empty cells are ignored</b>, so existing data is never erased.
              You can update up to <b>10,000</b> products at a time.
            </p>

            <div style={styles.row}>
              <button type="button" style={styles.btn} onClick={downloadExcel} disabled={excelBusy}>
                ↓ Download Excel
              </button>
              <input
                ref={excelRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={pickExcel}
                disabled={excelBusy}
                style={styles.file}
              />
              <button
                type="button"
                style={disabledStyle(!excelFile || excelBusy)}
                disabled={!excelFile || excelBusy}
                onClick={uploadExcel}
              >
                {excelBusy ? "Uploading..." : "Upload Details"}
              </button>
            </div>

            {excelMsg && (
              <div role="alert" style={styles.alert}>
                {excelMsg}
              </div>
            )}

            {excelSummary && (
              <>
                <div style={styles.summary}>
                  <div><b>{excelSummary.updated ?? 0}</b> updated</div>
                  <div><b>{excelSummary.unchanged ?? 0}</b> unchanged (nothing filled)</div>
                  <div><b>{excelSummary.failed ?? 0}</b> failed</div>
                  <div><b>{excelSummary.total_rows ?? 0}</b> rows</div>
                </div>

                {excelErrors.length > 0 && (
                  <>
                    <h4 style={styles.errHeading}>Rows with problems ({excelErrors.length})</h4>
                    <div style={styles.errors}>
                      {excelErrors.map((item, index) => (
                        <div key={`${item.row}-${index}`} style={styles.errRow}>
                          <b>Row {item.row}</b>
                          {item.name ? ` (${item.name})` : ""}:{" "}
                          {(Array.isArray(item.errors) ? item.errors : [String(item.errors)]).join(", ")}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* ---------------- ZIP ---------------- */}
          <div style={styles.box}>
            <h3 style={styles.title}>2. Product photos (ZIP)</h3>
            <p style={styles.hint}>
              Put the photos in one ZIP and name each file with the product <b>name</b>, <b>SKU</b> or{" "}
              <b>barcode</b>. No SKU needed.
              <br />
              <b>Name.jpg</b> = photo 1 (main), <b>Name_2.jpg</b> = photo 2, <b>Name_3.jpg</b> = photo 3,{" "}
              <b>Name_4.jpg</b> = photo 4. Example: <code>Amul Gold Milk 500ml.jpg</code>,{" "}
              <code>Amul Gold Milk 500ml_2.jpg</code>.
              <br />
              Capital or small letters, spaces, <code>-</code> and <code>_</code> do not matter
              (<code>parle-g-100g.jpg</code> matches "Parle G 100g"). The name must otherwise be the
              same as in the product list. If two products have the same name, use the SKU or
              barcode for those files.
              <br />
              JPG, PNG or WebP, up to 5 MB each. A photo replaces the existing photo at the same
              number; other photos stay as they are. Max 4 photos per product.
            </p>

            <div style={styles.row}>
              <input
                ref={zipRef}
                type="file"
                accept=".zip"
                onChange={pickZip}
                disabled={zipBusy}
                style={styles.file}
              />
              <button
                type="button"
                style={disabledStyle(!zipFile || zipBusy)}
                disabled={!zipFile || zipBusy}
                onClick={uploadZip}
              >
                {zipBusy ? "Uploading..." : "Upload Photos"}
              </button>
            </div>

            {zipMsg && (
              <div role="alert" style={styles.alert}>
                {zipMsg}
              </div>
            )}

            {zipSummary && (
              <>
                <div style={styles.summary}>
                  <div><b>{zipSummary.updated ?? 0}</b> photos saved</div>
                  <div><b>{zipSummary.not_found ?? 0}</b> product not found</div>
                  <div><b>{zipSummary.failed ?? 0}</b> failed</div>
                  <div><b>{zipSummary.total_files ?? 0}</b> files</div>
                </div>

                {zipProblems.length > 0 && (
                  <>
                    <h4 style={styles.errHeading}>Files with problems ({zipProblems.length})</h4>
                    <div style={styles.errors}>
                      {zipProblems.map((item, index) => (
                        <div key={`${item.file}-${index}`} style={styles.errRow}>
                          <b>{item.file}</b>: {item.reason || item.status}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}