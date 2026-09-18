import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import Layout from "../layout";
import { CSVLink } from "react-csv"; 
import jsPDF from "jspdf"; 
import "jspdf-autotable"; 
import autoTable from "jspdf-autotable"; 

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PriceOverride = () => {
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const today = new Date().toISOString().split("T")[0];
  const [products, setProducts] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [totalLoss, setTotalLoss] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    from_date: today,
    to_date: today,
    product_id: "",
    overridden_by: "",
    // branch_id: "",
  });

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const exportToPDF = () => {
    const doc = new jsPDF();
    const data = getExportData(); 
    const tableColumn = ["Date", "Bill No", "Product", "Original", "Override", "Total Loss", "Done By", "Branch"];
    const tableRows = data.map(item => [
      item.Date,
      item["Bill No"],
      item.Product,
      item["Original Price"],
      item["Override Price"],
      item["Total Loss"],
      item["Done By"],
      item.Branch
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows
    });

    doc.save("price-override-report.pdf");
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.product_id) params.product_id = filters.product_id;
      if (filters.overridden_by) params.overridden_by = filters.overridden_by;
      // if (filters.branch_id) params.branch_id = filters.branch_id;

      const response = await axios.get(`${BASE_URL}/api/price-override-report`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token}`,
        },
        params,
      });

      if (response.data && response.data.status) {
        const data = response.data.data || [];
        setRecords(data);
        setFilteredRecords(data);
        setTotalLoss(response.data.total_loss || 0);
      }
    } catch (error) {
      console.error("Error fetching price override report:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, user_data?.token]);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  useEffect(() => {
    const text = search.toLowerCase();
    const result = records.filter((r) => {
      return (
        (r.product?.name?.toLowerCase() || "").includes(text) ||
        (r.bill?.bill_no?.toString() || "").includes(text) ||
        (r.overridden_by?.name?.toLowerCase() || "").includes(text)
        // (r.branch?.name?.toLowerCase() || "").includes(text)
      );
    });
    setFilteredRecords(result);
  }, [search, records]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClearFilters = () => {
    const cleared = {
      from_date: today,
      to_date: today,
      product_id: "",
      overridden_by: "",
      //   branch_id: "",
    };
    setFilters(cleared);
    setLoading(true);
    axios.get(`${BASE_URL}/api/price-override-report`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${user_data?.token}`,
      },
      params: cleared,
    }).then((res) => {
      if (res.data && res.data.status) {
        const data = res.data.data || [];
        setRecords(data);
        setFilteredRecords(data);
        setTotalLoss(res.data.total_loss || 0);
      }
    }).catch(err => console.error(err)).finally(() => setLoading(false));
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/products`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token}`,
        },
      });

      setProducts(response.data.products || []);

    } catch (error) {
      console.error("Products Error:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/staff`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token}`,
        },
      });

      setStaffList(response.data.data || []);

    } catch (error) {
      console.error(
        "Staff Error:",
        error.response?.data || error.message
      );
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const columns = [
    {
      name: "#",
      cell: (row, index) => (currentPage - 1) * perPage + index + 1,
      width: "55px",
    },
    {
      name: "Date & Time",
      selector: (row) => row.created_at,
      sortable: true,
      width: "160px",
      cell: (row) => (
        <span style={{ fontSize: "12px" }}>
          {new Date(row.created_at).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      name: "Bill No",
      selector: (row) => row.bill?.bill_no,
      sortable: true,
      width: "140px",
      cell: (row) => (
        <span style={{ fontSize: "12px", fontWeight: 600 }}>
          {row.bill?.bill_no || "—"}
        </span>
      ),
    },
    {
      name: "Product",
      selector: (row) => row.product?.name,
      sortable: true,
      width: "180px",
      cell: (row) => (
        <span style={{ fontWeight: 500 }}>{row.product?.name || "—"}</span>
      ),
    },
    {
      name: "Branch",
      selector: (row) => row.branch?.name,
      sortable: true,
      width: "130px",
    },
    {
      name: "Original Price",
      selector: (row) => row.original_price,
      sortable: true,
      width: "130px",
      cell: (row) => <span>₹{Number(row.original_price).toFixed(2)}</span>,
    },
    {
      name: "Override Price",
      selector: (row) => row.override_price,
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span style={{ color: "#b45309", fontWeight: 600 }}>
          ₹{Number(row.override_price).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Diff/Unit",
      selector: (row) => row.difference,
      sortable: true,
      width: "100px",
      cell: (row) => (
        <span style={{ color: "#ef4444", fontWeight: 500 }}>
          -₹{Number(row.difference).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Qty",
      selector: (row) => row.qty,
      sortable: true,
      width: "70px",
    },
    {
      name: "Total Loss",
      selector: (row) => row.total_loss,
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span
          style={{
            color: "#fff",
            background: "#ef4444",
            borderRadius: "6px",
            padding: "3px 10px",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          -₹{Number(row.total_loss).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Done By",
      selector: (row) => row.overridden_by?.name,
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span
          style={{
            background: "#f3f4f6",
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {row.overridden_by?.name || "—"}
        </span>
      ),
    },
  ];

  const getExportData = () => {
    return filteredRecords.map((r) => ({
      Date: new Date(r.created_at).toLocaleDateString(),
      "Bill No": `\t${r.bill?.bill_no || "—"}`,
      Product: r.product?.name || "—",
      "Original Price": r.original_price,
      "Override Price": r.override_price,
      "Total Loss": r.total_loss,
      "Done By": r.overridden_by?.name || "—",
      Branch: r.branch?.name || "—"
    }));
  };
  const exportData = getExportData();

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">

          {/* Title Area */}
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>Price Override Report</h3>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li><i className="icon-chevron-right" /></li>
              <li>
                <div className="text-tiny">Price Override Report</div>
              </li>
            </ul>
          </div>

          {/* COMPACT LOSS MINI BOX - Small and clean */}
          <div style={{ maxWidth: "250px" }} className="mb-20">
            <div
              className="wg-box"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "12px 16px",
              }}
            >
              <p style={{ fontSize: "11px", color: "#ef4444", margin: "0 0 2px 0", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Loss
              </p>
              <h3 style={{ fontSize: "22px", fontWeight: "800", color: "#dc2626", margin: 0 }}>
                -₹{Number(totalLoss).toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="wg-box mb-20" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>Filters</div>

            <div style={{ display: "flex", flexDirection: "row", gap: "12px", alignItems: "flex-end", width: "100%", flexWrap: "nowrap" }}>

              {/* From Date */}
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                  START DATE
                </label>
                <input
                  type="date"
                  name="from_date"
                  className="form-control"
                  style={{ height: "48px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", padding: "0 10px", width: "100%" }}
                  value={filters.from_date}
                  onChange={handleFilterChange}
                />
              </div>

              {/* To Date */}
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                  END DATE
                </label>
                <input
                  type="date"
                  name="to_date"
                  className="form-control"
                  style={{ height: "48px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", padding: "0 10px", width: "100%" }}
                  value={filters.to_date}
                  onChange={handleFilterChange}
                />
              </div>

              {/* Product ID Input */}
              <div style={{ flex: 1, minWidth: "110px" }}>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                  PRODUCTS
                </label>
                <select
                  name="product_id"
                  className="form-control"
                  value={filters.product_id}
                  onChange={handleFilterChange}
                   style={{ height: "48px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", padding: "0 10px", width: "100%" }}
                >
                  <option value="">All Products</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}

                </select>
              </div>

              {/* Staff ID Input */}
              <div style={{ flex: 1, minWidth: "110px" }}>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                  STAFFS
                </label>
                <select
                  name="overridden_by"
                  className="form-control"
                  value={filters.overridden_by}
                  onChange={handleFilterChange}
                   style={{ height: "48px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", padding: "0 10px", width: "100%" }}
                >
                  <option value="">All Staff</option>

                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}

                </select>
              </div>

              {/* Action Buttons: Unified into the layout alignment */}
              <div style={{ display: "flex", gap: "8px", minWidth: "180px" }}>
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="btn btn-success"
                  style={{
                    height: "45px",
                    background: loading ? "#10b981" : "#22c55e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0 16px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    flex: 1,
                    whiteSpace: "nowrap"
                  }}
                >
                  {loading ? "Loading..." : "Apply"}
                </button>
                <button
                  onClick={handleClearFilters}
                  className="btn btn-secondary"
                  style={{
                    height: "45px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "0 16px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Clear
                </button>
              </div>

            </div>
            <div className="flex gap-2">
              {/* CSV/Excel Export */}
              <CSVLink
                data={exportData}
                filename={"price-override-report.csv"}
                className="btn btn-primary"
                style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", borderRadius: "6px" }}
              >
                Export Excel
              </CSVLink>

              {/* PDF Export */}
              <button
                onClick={exportToPDF}
                className="btn btn-danger"
                style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", borderRadius: "6px" }}
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* Table Container Area */}
          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form className="form-search" onSubmit={(e) => e.preventDefault()}>
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search by product, bill no, staff..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </fieldset>
                </form>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredRecords}
              pagination
              paginationPerPage={perPage}
              onChangePage={(page) => setCurrentPage(page)}
              highlightOnHover
              pointerOnHover
              responsive
              progressPending={loading}
              noDataComponent={
                <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500 }}>No price overrides found</p>
                </div>
              }
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "12px",
                    background: "#f9fafb",
                  },
                },
                rows: {
                  style: {
                    fontSize: "13px",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PriceOverride;