import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import DataTable from "react-data-table-component";
import { RefreshCw, FileSpreadsheet, FileDown } from "lucide-react";
import Layout from "../../layout";
import { useAppData } from "../../../context/AppDataContext";

const defaultFilters = {
  date_range: "this_month",
  date_from: "",
  date_to: "",
  schedule: "all",
  branch_id: "",
  search: "",
};

const headerWrapCss = `
  .rdt_TableCol_Sortable,
  .rdt_TableCol_Sortable > div,
  .rdt_TableCol > div {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    line-height: 1.2;
  }
`;

const ScheduleBadge = ({ s }) => {
  const strict = s === "H1" || s === "X";
  const cls = strict
    ? "bg-red-100 text-red-800 border-red-300"
    : s === "H"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`px-3 py-1 rounded-full text-lg font-bold border ${cls}`}>
      {s === "none" ? "Rx" : s}
    </span>
  );
};

export default function PrescriptionRegister() {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const appData = useAppData();
  const branches = appData?.branches || [];

  const [filters, setFilters] = useState(defaultFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appData?.loadBranches();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim()), 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  const fetchReport = async () => {
    if (
      filters.date_range === "custom" &&
      (!filters.date_from || !filters.date_to)
    ) {
      return;
    }

    try {
      setLoading(true);
      const params = {
        date_range: filters.date_range,
        schedule: filters.schedule,
        branch_id: filters.branch_id || null,
        search: debouncedSearch || null,
      };
      if (filters.date_range === "custom") {
        params.date_from = filters.date_from;
        params.date_to = filters.date_to;
      }

      const res = await axios.get(
        `${BASE_URL}/api/reports/prescription-register`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data?.token}`,
          },
          params,
        },
      );
      setReport(res.data);
    } catch (err) {
      console.error(err);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line
  }, [
    filters.date_range,
    filters.date_from,
    filters.date_to,
    filters.schedule,
    filters.branch_id,
    debouncedSearch,
  ]);

  const rows = report?.rows || [];
  const summary = report?.summary || {};
  const store = report?.store || {};

  const periodLabel =
    filters.date_range === "custom"
      ? `${filters.date_from} to ${filters.date_to}`
      : filters.date_range.replace(/_/g, " ");

  const exportToExcel = () => {
    if (!rows.length) return;

    const head = [
      "Sr No",
      "Date",
      "Bill No",
      "Medicine",
      "Schedule",
      "Batch",
      "Expiry",
      "Qty",
      "Returned Qty",
      "Patient Name",
      "Age",
      "Patient Address",
      "Doctor Name",
      "Doctor Reg. No",
      "Prescription No",
      "Prescription Date",
      "Dispensed By",
    ];

    const body = rows.map((r, i) => [
      i + 1,
      r.dispensed_at,
      String(r.bill_no),
      r.product_name,
      r.drug_schedule,
      r.batch_no || "",
      r.expiry_date || "",
      r.qty_label ?? r.qty,
      r.returned_label ?? r.returned_qty,
      r.patient_name,
      r.patient_age ?? "",
      r.patient_address || "",
      r.doctor_name,
      r.doctor_reg_no || "",
      r.prescription_no || "",
      r.prescription_date || "",
      r.dispensed_by_name || "",
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([
      [`Prescription Register - ${store.name || ""}`],
      [`Drug Licence: ${store.drug_licence_no || "-"}`],
      [
        `Pharmacist: ${store.pharmacist_name || "-"} ${store.pharmacist_reg_no ? `(Reg: ${store.pharmacist_reg_no})` : ""}`,
      ],
      [`Period: ${periodLabel}`],
      [],
      head,
      ...body,
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Register");
    XLSX.writeFile(wb, `Prescription_Register_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (!rows.length) return;

    const doc = new jsPDF("landscape");
    doc.setFontSize(15);
    doc.text(`Prescription Register - ${store.name || ""}`, 14, 14);
    doc.setFontSize(9);
    doc.text(`Drug Licence No: ${store.drug_licence_no || "-"}`, 14, 20);
    doc.text(
      `Pharmacist: ${store.pharmacist_name || "-"}${store.pharmacist_reg_no ? ` (Reg: ${store.pharmacist_reg_no})` : ""}`,
      14,
      25,
    );
    doc.text(
      `Period: ${periodLabel}   |   Generated: ${new Date().toLocaleString()}`,
      14,
      30,
    );

    autoTable(doc, {
      startY: 34,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      head: [
        [
          "Sr",
          "Date",
          "Bill No",
          "Patient (Name, Age, Address)",
          "Prescriber (Name, Reg. No)",
          "Medicine",
          "Sch",
          "Batch",
          "Qty",
        ],
      ],
      body: rows.map((r, i) => [
        i + 1,
        r.dispensed_at,
        String(r.bill_no),
        `${r.patient_name}${r.patient_age ? `, ${r.patient_age}y` : ""}${r.patient_address ? `\n${r.patient_address}` : ""}`,
        `${r.doctor_name}${r.doctor_reg_no ? `\nReg: ${r.doctor_reg_no}` : ""}`,
        r.product_name,
        r.drug_schedule === "none" ? "Rx" : r.drug_schedule,
        r.batch_no || "-",
        r.returned_qty > 0
          ? `${r.qty_label ?? r.qty} (ret. ${r.returned_label ?? r.returned_qty})`
          : (r.qty_label ?? r.qty),
      ]),
    });

    doc.save(`Prescription_Register_${Date.now()}.pdf`);
  };

  const columns = [
    {
      name: "Date",
      selector: (r) => r.dispensed_at,
      sortable: true,
      minWidth: "150px",
      wrap: true,
    },
    {
      name: "Bill No",
      selector: (r) => r.bill_no,
      sortable: true,
      minWidth: "170px",
      wrap: true,
    },
    {
      name: "Medicine",
      selector: (r) => r.product_name,
      sortable: true,
      grow: 2,
      minWidth: "200px",
      wrap: true,
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-800">{r.product_name}</div>
          {r.salt_composition && (
            <div className="text-xl text-gray-500">{r.salt_composition}</div>
          )}
        </div>
      ),
    },
    {
      name: "Sch",
      selector: (r) => r.drug_schedule,
      sortable: true,
      center: true,
      cell: (r) => <ScheduleBadge s={r.drug_schedule} />,
    },
    {
      name: "Batch / Exp",
      minWidth: "140px",
      wrap: true,
      cell: (r) => (
        <div>
          <div className="font-semibold">{r.batch_no || "-"}</div>
          <div className="text-xl text-gray-500">{r.expiry_date || ""}</div>
        </div>
      ),
    },
    {
      name: "Qty",
      selector: (r) => r.qty,
      sortable: true,
      right: true,
      minWidth: "180px",
      wrap: true,
      cell: (r) => (
        <div className="text-right">
          <div className="font-semibold">{r.qty_label ?? r.qty}</div>
          {r.returned_qty > 0 && (
            <div className="text-2xl text-red-600">
              ↩ {r.returned_label ?? r.returned_qty} returned
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Patient",
      selector: (r) => r.patient_name,
      sortable: true,
      grow: 2,
      minWidth: "200px",
      wrap: true,
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-800">
            {r.patient_name}
            {r.patient_age ? `, ${r.patient_age}y` : ""}
          </div>
          {r.patient_address && (
            <div className="text-xl text-gray-500">{r.patient_address}</div>
          )}
        </div>
      ),
    },
    {
      name: "Doctor",
      selector: (r) => r.doctor_name,
      sortable: true,
      minWidth: "170px",
      wrap: true,
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-800">{r.doctor_name}</div>
          {r.doctor_reg_no && (
            <div className="text-xl text-gray-500">Reg: {r.doctor_reg_no}</div>
          )}
        </div>
      ),
    },
    { name: "Rx No", selector: (r) => r.prescription_no || "-", wrap: true },
    {
      name: "Dispensed By",
      selector: (r) => r.dispensed_by_name || "-",
      wrap: true,
    },
  ];

  const inputCls =
    "block w-full mt-3 rounded-2xl border border-gray-300 px-4 py-4 text-2xl";
  const labelCls = "text-2xl font-semibold text-gray-900";

  return (
    <Layout>
      <style>{headerWrapCss}</style>
      <div className="p-8 bg-white min-h-screen text-gray-900">
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
              }}
            >
              Prescription Register
            </h3>
            <p className="text-lg text-gray-500">
              Schedule H / H1 / X sales with patient and prescriber details
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 mt-5 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div>
              <label className={labelCls}>Date Range</label>
              <select
                className={inputCls}
                value={filters.date_range}
                onChange={(e) =>
                  setFilters({ ...filters, date_range: e.target.value })
                }
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Schedule</label>
              <select
                className={inputCls}
                value={filters.schedule}
                onChange={(e) =>
                  setFilters({ ...filters, schedule: e.target.value })
                }
              >
                <option value="all">All</option>
                <option value="H">Schedule H</option>
                <option value="H1">Schedule H1</option>
                <option value="X">Schedule X</option>
                <option value="none">Other Rx</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Branch</label>
              <select
                className={inputCls}
                value={filters.branch_id}
                onChange={(e) =>
                  setFilters({ ...filters, branch_id: e.target.value })
                }
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className={labelCls}>Search</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Patient, doctor, medicine, batch, bill no..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
            </div>

            {filters.date_range === "custom" && (
              <>
                <div>
                  <label className={labelCls}>From</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={filters.date_from}
                    onChange={(e) =>
                      setFilters({ ...filters, date_from: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>To</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={filters.date_to}
                    onChange={(e) =>
                      setFilters({ ...filters, date_to: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setFilters(defaultFilters)}
              title="Reset"
              className="flex items-center justify-center bg-green-600 text-white h-[40px] w-[40px] rounded-xl shadow-md hover:bg-green-700"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={21} />
            </button>
            <button
              onClick={exportToExcel}
              title="Export as Excel"
              className="flex items-center justify-center bg-green-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-green-700 shadow-md"
            >
              <FileSpreadsheet size={21} />
            </button>
            <button
              onClick={exportToPDF}
              title="Export as PDF"
              className="flex items-center justify-center bg-red-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-red-700 shadow-md"
            >
              <FileDown size={21} />
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[
            [
              "Total Entries",
              summary.total_entries ?? 0,
              "bg-blue-50 text-blue-700 border-blue-200",
            ],
            [
              "Total Units",
              summary.total_qty ?? 0,
              "bg-emerald-50 text-emerald-700 border-emerald-200",
            ],
            [
              "Unique Patients",
              summary.unique_patients ?? 0,
              "bg-purple-50 text-purple-700 border-purple-200",
            ],
            [
              "H1 / X Entries",
              summary.h1_entries ?? 0,
              "bg-rose-50 text-rose-700 border-rose-200",
            ],
          ].map(([title, value, cls]) => (
            <div
              key={title}
              className={`${cls} p-4 rounded-3xl shadow-xl border text-center`}
            >
              <p className="text-xl font-semibold mb-2">{title}</p>
              <h2 className="text-3xl font-bold">{value}</h2>
            </div>
          ))}
        </div>

        {/* TABLE */}
        <div className="bg-white shadow-xl border border-gray-200 rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            progressPending={loading}
            pagination
            paginationPerPage={25}
            paginationRowsPerPageOptions={[25, 50, 100]}
            highlightOnHover
            responsive
            noDataComponent={
              <p className="text-xl text-gray-500 font-semibold py-8">
                No prescription entries for this period.
              </p>
            }
            customStyles={{
              headCells: {
                style: {
                  fontWeight: 600,
                  fontSize: "15px",
                  color: "#374151",
                  backgroundColor: "#e0f2fe",
                  whiteSpace: "normal",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                },
              },
              cells: { style: { fontSize: "15px", padding: "12px 14px" } },
            }}
          />
        </div>
      </div>
    </Layout>
  );
}
