import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import Layout from "./layout";
import { useAppData } from "../context/AppDataContext";

const SEARCH_MAX = 100;

const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

// "2026-11-23" / "2026-11-23T00:00:00Z" -> "23/11/2026" (timezone ki wajah se date ek din peeche nahi jayegi)
const prettyDate = (value) => {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "-";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

// "purchase_return" -> "Purchase return"
const prettyType = (value) => {
  if (!value) return "-";
  const s = String(value).replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const PurchaseReturn = () => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const appData = useAppData();
  const returns = appData?.purchaseReturns || [];

  const handleCreatePurchaseReturns = () => {
    localStorage.setItem("purchase_return_bills_create", null);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await appData?.loadPurchaseReturns();
      } catch (err) {
        console.error("Error fetching purchase returns:", err);
        if (alive) {
          setLoadError(
            err?.response?.data?.message ||
              "Could not load purchase returns. Please try again.",
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return returns;

    return returns.filter((item) => {
      const searchable = [
        item?.purchase_bill?.bill_no,
        item?.branch?.name,
        item?.supplier?.name,
        prettyDate(item?.return_date),
        item?.return_date,
        prettyType(item?.return_type),
        item?.total_gst,
        item?.total_amount,
      ]
        .filter((v) => v !== null && v !== undefined && v !== "")
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [returns, search]);

  const columns = [
    {
      name: "Purchase Bill No",
      selector: (row) => row?.purchase_bill?.bill_no || "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Branch Name",
      selector: (row) => row?.branch?.name || "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Supplier Name",
      selector: (row) => row?.supplier?.name || "-",
      sortable: true,
      wrap: true,
    },
    {
      name: "Return Date",
      // Sort raw YYYY-MM-DD par hota hai, dikhta dd/mm/yyyy
      selector: (row) => String(row?.return_date || "").slice(0, 10),
      sortable: true,
      wrap: true,
      cell: (row) => prettyDate(row?.return_date),
    },
    {
      name: "Total Gst",
      selector: (row) => Number(row?.total_gst) || 0,
      sortable: true,
      right: true,
      wrap: true,
      cell: (row) => inr(row?.total_gst),
    },
    {
      name: "Total Amount",
      selector: (row) => Number(row?.total_amount) || 0,
      sortable: true,
      right: true,
      wrap: true,
      cell: (row) => <strong>{inr(row?.total_amount)}</strong>,
    },
    {
      name: "Return Type",
      selector: (row) => row?.return_type || "",
      sortable: true,
      wrap: true,
      cell: (row) => prettyType(row?.return_type),
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <div className="flex items-center flex-wrap justify-between gap20 mb-27">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    width: "5px",
                    height: "34px",
                    borderRadius: "999px",
                    background: "linear-gradient(180deg, #2f63f6, #1f49dd)",
                    display: "inline-block",
                  }}
                />
                <div>
                  <h3
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#111827",
                      margin: 0,
                      lineHeight: 1.2,
                    }}
                  >
                    Purchase Return Bills
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Track and manage returns and replacements sent back to suppliers
                  </p>
                </div>
              </div>
            </div>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">
                  <div className="text-tiny">Purchase Return</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Purchase Return Bills</div>
              </li>
            </ul>
          </div>
          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search bill no, supplier, branch, date, amount..."
                      maxLength={SEARCH_MAX}
                      autoComplete="off"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>

              <Link
                className="tf-button style-1 w208"
                to="/create-purchase-return-bill"
                onClick={handleCreatePurchaseReturns}
              >
                <i className="icon-plus"></i>Add Return Bill
              </Link>

              <Link
                className="tf-button style-1 w208"
                to="/create-purchase-replace"
              >
                <i className="icon-plus"></i>Add Replace Bill
              </Link>
            </div>

            {loadError && (
              <div className="error-text mb-15" role="alert">
                {loadError}
              </div>
            )}

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              paginationResetDefaultPage={Boolean(search)}
              highlightOnHover
              responsive
              progressPending={loading && returns.length === 0}
              progressComponent={
                <div className="text-center p-20">
                  Loading purchase returns...
                </div>
              }
              noDataComponent={
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#6b7280" }}>
                  <strong
                    style={{ display: "block", marginBottom: 4, fontSize: 16, color: "#111827" }}
                  >
                    {returns.length === 0
                      ? "No purchase returns yet"
                      : "No returns match your search"}
                  </strong>
                  {returns.length === 0
                    ? "Click Add Return Bill to create the first one."
                    : "Try a different bill no, supplier or date."}
                </div>
              }
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "14px",
                  },
                },
              }}
            />
            <div className="divider"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default PurchaseReturn;