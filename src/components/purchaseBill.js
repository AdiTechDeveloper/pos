import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";
import { CSVLink } from "react-csv";
import { FileSpreadsheet, FileDown, CalendarDays, RotateCcw } from "lucide-react";


const todayStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const raw = String(value).split("T")[0];

  // API date is normally YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Also support DD-MM-YYYY / DD/MM/YYYY.
  const match = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const money = (value) => Number(value || 0).toFixed(2);

const PurchaseBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [resetPaging, setResetPaging] = useState(false);
  const [loading, setLoading] = useState(false);
  // Empty means show all purchase bills; select a date to filter one day.
  const [selectedDate, setSelectedDate] = useState("");
  
  // const [purchaseBill, setPurchaseBill] = useState([]);
  const appData = useAppData();
  const purchaseBill = appData?.purchaseBills || [];
  const totalRows = appData?.purchaseBillsMeta?.total ?? purchaseBill.length;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleCreatePurchaseBills = () => {
    localStorage.setItem("purchase_bills_create", null);
  };

  const handleEdit = (row) => {
    localStorage.setItem("purchase_bills_create", JSON.stringify(row));
  };

  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this Purchase Bill?")) {
      handleDelete(id);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(
        `${BASE_URL}/api/purchase-bill/${id}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );
      if (response) {
        toast.success("Purchase Bill Deleted!");
        appData?.invalidate("purchaseBills");
        await appData?.loadPurchaseBills({
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          selected_date: selectedDate || undefined,
        });
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete purchase bill.",
      );
    }
  };

  const columns = [
    // {
    //   name: "ID",
    //   cell: (row, index) => (currentPage - 1) * perPage + index + 1,
    //   width: "60px",
    // },
    {
      name: "Action",
      width: "120px",
      cell: (row) => (
        <div className="list-icon-function">
          <span className="item edit mr-10" title="Edit">
            <Link
              to={`/purchase-bill/edit/${row.id}`}
              onClick={() => handleEdit(row)}
            >
              <i className="icon-edit-3" />
            </Link>
          </span>
          {/* <span
            className="item trash"
            title="Delete"
            onClick={() => handleDeleteConfirm(row.id)}
          >
            <i className="icon-trash-2" />
          </span> */}
        </div>
      ),
    },
    {
      name: "Inward No.",
      selector: (row) => row.inward_no,
      sortable: true,
      width: "180px",
      wrap: true,
    },
    {
      name: "Supplier Name",
      selector: (row) => row.supplier?.name,
      sortable: true,
      width: "200px",
      wrap: true,
    },
    {
      name: "Bill No",
      selector: (row) => row.bill_no,
      sortable: true,
      width: "150px",
      wrap: true,
      cell: (row) => (
        <span style={row.is_lost ? { color: "#ef4444", fontWeight: 600 } : {}}>
          {row.bill_no}
          {row.is_lost ? (
            <span
              style={{
                marginLeft: "6px",
                fontSize: "10px",
                background: "#fef2f2",
                color: "#ef4444",
                border: "1px solid #fecaca",
                borderRadius: "4px",
                padding: "1px 5px",
                fontWeight: 500,
              }}
            >
              LOST
            </span>
          ) : null}
        </span>
      ),
    },
    {
      name: "Bill Date",
      selector: (row) => row.bill_date,
      sortable: true,
      width: "110px",
      wrap: true,
      cell: (row) => {
        const date = new Date(row.bill_date);
        return date.toLocaleDateString("en-GB");
      },
    },
    {
      name: "Taxable Amt",
      selector: (row) => row.taxable_value,
      sortable: true,
      width: "150px",
      wrap: true,
    },
    {
      name: "CGST",
      selector: (row) => row.cgst_amount,
      sortable: true,
      width: "90px",
      wrap: true,
    },
    {
      name: "SGST",
      selector: (row) => row.sgst_amount,
      sortable: true,
      width: "90px",
      wrap: true,
    },
    {
      name: "IGST",
      selector: (row) => row.igst_amount,
      sortable: true,
      width: "90px",
      wrap: true,
    },
    {
      name: "CESS",
      selector: (row) => row.cess_amount,
      sortable: true,
      width: "90px",
      wrap: true,
    },
    {
      name: "Total Tax",
      selector: (row) => row.total_tax,
      sortable: true,
      width: "120px",
      wrap: true,
    },
    {
      name: "Total",
      selector: (row) => row.total_amount,
      sortable: true,
      width: "120px",
      wrap: true,
    },
    {
      name: "Expiry Date",
      selector: (row) => row.lines?.[0]?.expiry_date ?? "—",
      sortable: true,
      width: "150px",
      wrap: true,
      cell: (row) => {
        const rawDate = row.lines?.[0]?.expiry_date;
        if (!rawDate) return "—";

        const date = new Date(rawDate);
        const formatted = date.toLocaleDateString("en-GB");
        const isExpired = date < new Date();

        return (
          <span style={{ color: isExpired ? "red" : "inherit" }}>
            {formatted}
          </span>
        );
      },
    },
    {
      name: "Settlement Amount",
      selector: (row) => row.settlement_amount ?? "00",
      sortable: true,
      width: "200px",
      wrap: true,
    },
    {
      name: "Settlement Note",
      selector: (row) => row.notes ?? "-",
      sortable: true,
      width: "200px",
      wrap: true,
    },
  ];

  // const fetchPurchaseBill = async () => {
  //   try {
  //     const response = await axios.get(`${BASE_URL}/api/purchase-bill`, {
  //       headers: {
  //         Accept: "application/json",
  //         Authorization: `Bearer ${user_data.token}`,
  //       },
  //     });
  //     setPurchaseBill(response.data.data);
  //   } catch (error) {
  //     console.error("Error fetching purchase bills:", error);
  //   }
  // };

  // useEffect(() => {
  //   fetchPurchaseBill();
  // }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
      setResetPaging((v) => !v);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      await appData?.loadPurchaseBills({
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        // AppDataContext/API should pass this as ?selected_date=YYYY-MM-DD.
        selected_date: selectedDate || undefined,
      });
    } catch (error) {
      console.error("Error loading purchase bills:", error);
      toast.error("Failed to load purchase bills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // fetchBills is intentionally recreated on render; use its input values as dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debouncedSearch, selectedDate]);

  // Client-side safety filter for the currently loaded page.
  // Server-side filtering is also requested through selected_date above.
  const visibleBills = useMemo(() => {
    if (!selectedDate) return purchaseBill;

    return purchaseBill.filter(
      (bill) => toDateInputValue(bill.bill_date) === selectedDate
    );
  }, [purchaseBill, selectedDate]);

  const csvHeaders = [
    { label: "Inward No.", key: "inward_no" },
    { label: "Supplier Name", key: "supplier_name" },
    { label: "Bill No", key: "bill_no" },
    { label: "Bill Date", key: "bill_date" },
    { label: "Taxable Amount", key: "taxable_value" },
    { label: "CGST", key: "cgst_amount" },
    { label: "SGST", key: "sgst_amount" },
    { label: "IGST", key: "igst_amount" },
    { label: "CESS", key: "cess_amount" },
    { label: "Total Tax", key: "total_tax" },
    { label: "Total Amount", key: "total_amount" },
    { label: "Settlement Amount", key: "settlement_amount" },
    { label: "Settlement Note", key: "notes" },
  ];

  const exportData = visibleBills.map((bill) => ({
    inward_no: bill.inward_no || "",
    supplier_name: bill.supplier?.name || "",
    bill_no: bill.bill_no || "",
    bill_date: toDateInputValue(bill.bill_date),
    taxable_value: money(bill.taxable_value),
    cgst_amount: money(bill.cgst_amount),
    sgst_amount: money(bill.sgst_amount),
    igst_amount: money(bill.igst_amount),
    cess_amount: money(bill.cess_amount),
    total_tax: money(bill.total_tax),
    total_amount: money(bill.total_amount),
    settlement_amount: money(bill.settlement_amount),
    notes: bill.notes || "",
  }));

  const exportPDF = () => {
    const rows = visibleBills.map((bill) => `
      <tr>
        <td>${bill.inward_no || ""}</td>
        <td>${bill.supplier?.name || ""}</td>
        <td>${bill.bill_no || ""}</td>
        <td>${toDateInputValue(bill.bill_date)}</td>
        <td>${money(bill.taxable_value)}</td>
        <td>${money(bill.total_tax)}</td>
        <td>${money(bill.total_amount)}</td>
        <td>${money(bill.settlement_amount)}</td>
      </tr>
    `).join("");

    const title = selectedDate
      ? `Purchase Bills - ${selectedDate}`
      : "Purchase Bills - All Dates";

    const printWindow = window.open("", "_blank", "width=1100,height=750");
    if (!printWindow) {
      toast.error("Please allow pop-ups to export PDF.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h2 { margin: 0 0 6px; }
            p { margin: 0 0 18px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; }
            th { background: #f3f4f6; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h2>Purchase Bills</h2>
          <p>${selectedDate ? `Bill date: ${selectedDate}` : "All dates"} | Records: ${visibleBills.length}</p>
          <table>
            <thead>
              <tr>
                <th>Inward No.</th><th>Supplier</th><th>Bill No</th><th>Bill Date</th>
                <th>Taxable</th><th>Total Tax</th><th>Total</th><th>Settlement</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="8">No purchase bills found</td></tr>'}</tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
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
                  Purchase Bills
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    margin: "2px 0 0 0",
                  }}
                >
                  Track and manage the bills
                </p>
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
                  <div className="text-tiny">Purchase Bill</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Purchase Bill</div>
              </li>
            </ul>
          </div>

          <div className="wg-box mb-50">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search purchase bills..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-required="true"
                    />
                  </fieldset>
                  <div className="button-submit">
                    <button type="submit">
                      <i className="icon-search"></i>
                    </button>
                  </div>
                </form>
              </div>

              {/* Date Filter + Export Controls */}
              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setPage(1);
                      setResetPaging((value) => !value);
                    }}
                    className="px-3 py-2 border rounded"
                    aria-label="Filter purchase bills by bill date"
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate("");
                        setPage(1);
                        setResetPaging((value) => !value);
                      }}
                      title="Clear date filter"
                      className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                    >
                      <RotateCcw size={15} />
                      Clear
                    </button>
                  )}
                </div>

                <CSVLink
                  data={exportData}
                  headers={csvHeaders}
                  filename={`purchase-bills${selectedDate ? `-${selectedDate}` : ""}.csv`}
                  title="Export as Excel"
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 shadow-sm"
                >
                  <FileSpreadsheet size={22} />
                </CSVLink>

                <button
                  type="button"
                  onClick={exportPDF}
                  title="Export as PDF"
                  className="flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 shadow-sm"
                >
                  <FileDown size={22} />
                </button>
              </div>

              <Link
                className="tf-button style-1 w208"
                to="/create-purchase-bill"
                onClick={handleCreatePurchaseBills}
              >
                <i className="icon-plus"></i>Add new
              </Link>
            </div>

            <DataTable
              columns={columns}
              data={visibleBills}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[25, 50, 100]}
              paginationResetDefaultPage={resetPaging}
              onChangePage={(p) => setPage(p)}
              onChangeRowsPerPage={(n, p) => {
                setPerPage(n);
                setPage(p);
              }}
              progressPending={loading}
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={{
                headCells: { style: { fontWeight: "bold", fontSize: "12px" } },
              }}
            />
            <div className="divider"></div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PurchaseBill;
