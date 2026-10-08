import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";
import { useAppData } from "../context/AppDataContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FileSpreadsheet, FileDown } from "lucide-react";

const Customer = () => {
  const appData = useAppData();
  const customers = appData?.customers || [];
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const exportPDF = () => {
    const doc = new jsPDF("landscape");

    doc.setFontSize(18);
    doc.text("Customer Report", 14, 18);

    autoTable(doc, {
      startY: 28,
      head: [[
        "Name",
        "Mobile",
        "Address",
        "Area",
        "City",
        "Opening Balance",
        "Loyalty Points",
        "Created",
      ]],
      body: customers.map((customer) => [
        customer.name || "-",
        customer.mobile || "-",
        [customer.add1, customer.add2].filter(Boolean).join(", ") || "-",
        customer.area || "-",
        customer.city || "-",
        Number(customer.opening_balance ?? 0).toFixed(2),
        Number(customer.loyalty_points ?? 0).toFixed(2),
        formatDate(customer.created_at),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
      },
    });

    doc.save("customers.pdf");
  };
  const exportExcel = () => {
    const data = customers.map((customer) => ({
      Name: customer.name || "-",
      Mobile: customer.mobile || "-",
      Address: [customer.add1, customer.add2].filter(Boolean).join(", ") || "-",
      Area: customer.area || "-",
      City: customer.city || "-",
      "Opening Balance": Number(customer.opening_balance ?? 0),
      "Loyalty Points": Number(customer.loyalty_points ?? 0),
      Created: formatDate(customer.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    XLSX.writeFile(workbook, "customers.xlsx");
  };

  useEffect(() => {
    appData?.loadCustomers();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();
    const result = customers.filter((item) => {
      const searchable = `
        ${item.id ?? ""}
        ${item.name ?? ""}
        ${item.mobile ?? ""}
        ${item.add1 ?? ""}
        ${item.add2 ?? ""}
        ${item.area ?? ""}
        ${item.city ?? ""}
      `.toLowerCase();
      return searchable.includes(searchText);
    });
    setFilteredData(result);
  }, [search, customers]);

  const money = (value) =>
    value === null || value === undefined || value === ""
      ? "0.00"
      : Number(value).toFixed(2);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("en-IN") : "-";

  const columns = [

    {
      name: "Name",
      selector: (row) => row.name || "-",
      sortable: true,
      width: "200px",
    },
    {
      name: "Mobile",
      selector: (row) => row.mobile || "-",
      sortable: true,
      width: "150px",
    },
    {
      name: "Address",
      selector: (row) => [row.add1, row.add2].filter(Boolean).join(", ") || "-",
      sortable: true,
      width: "280px",
      wrap: true,
    },
    {
      name: "Area",
      selector: (row) => row.area || "-",
      sortable: true,
      width: "140px",
    },
    {
      name: "City",
      selector: (row) => row.city || "-",
      sortable: true,
      width: "140px",
    },
    {
      name: "Opening Balance",
      selector: (row) => Number(row.opening_balance ?? 0),
      format: (row) => money(row.opening_balance),
      sortable: true,
      width: "160px",
    },
    {
      name: "Loyalty Points",
      selector: (row) => Number(row.loyalty_points ?? 0),
      format: (row) => money(row.loyalty_points),
      sortable: true,
      width: "150px",
    },
    {
      name: "Created",
      selector: (row) => row.created_at,
      format: (row) => formatDate(row.created_at),
      sortable: true,
      width: "130px",
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <div className="flex items-center flex-wrap justify-between gap20 mb-27">
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
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
                    Customers
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    View your customers (read only)
                  </p>
                </div>
              </div>
            </div>
            <ul className="breadcrumbs flex items-center flex-wrap justify-start gap10">
              <li>
                <Link to="/dashboard">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="#">
                  <div className="text-tiny">Customers</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Customers</div>
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
                      placeholder="Search by name, mobile, area or city..."
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
              <div className="flex items-center gap10">

                <button
                  onClick={exportExcel}
                  title="Export as CSV"
                  className="flex items-center justify-center bg-green-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-green-700 shadow-md"
                >
                  <FileSpreadsheet size={21} />
                </button>

                <button
                  onClick={exportPDF}
                  title="Export as PDF"
                  className="flex items-center justify-center bg-red-500 text-white w-[40px] h-[40px] rounded-xl hover:bg-red-700 shadow-md"
                >
                  <FileDown size={21} />
                </button>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              responsive
              noDataComponent="No customers found"
              customStyles={{
                headCells: {
                  style: { fontWeight: "bold", fontSize: "14px" },
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

export default Customer;
