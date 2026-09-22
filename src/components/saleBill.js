import React, { useEffect, useState, useRef, useMemo } from "react";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import axios from "axios";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Layout from "./layout";
import ReceiptModal from "./ReceiptModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PaymentEditModal from "../components/PaymentEditModal";
import { Check, RotateCcw, FileSpreadsheet, FileDown , Printer ,  Wallet} from "lucide-react";



const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;

  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : {};
};

const SaleBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [saleBills, setSaleBills] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [printData, setPrintData] = useState(null);
  const receiptRef = useRef();
  const [filteredData, setFilteredData] = useState([]);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const openPaymentModal = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  // Fetch Sale Bills from API
  const fetchSaleBill = async (dateParam = selectedDate) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/sales-bills`, {
        params: {
          selected_date: dateParam || undefined, // Sends YYYY-MM-DD to API
        },
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token}`,
        },
      });
      setSaleBills(response.data.data || []);
    } catch (error) {
      console.error("Error fetching sales bills:", error);
    }
  };

  // Re-fetch API data whenever selectedDate changes
  useEffect(() => {
    fetchSaleBill(selectedDate);
  }, [selectedDate]);

  // Handle Client-Side Search AND Date Filtering
  useEffect(() => {
    const searchText = search.toLowerCase().trim();

    const result = saleBills.filter((item) => {
      // Format item date to YYYY-MM-DD for comparison
      const itemDateStr = item.created_at
        ? new Date(item.created_at).toISOString().split("T")[0]
        : "";

      const matchesDate = selectedDate ? itemDateStr === selectedDate : true;

      // Text Search Filtering
      const formattedDate = new Date(item.created_at).toLocaleDateString(
        "en-IN",
      );
      const searchable = `
        ${item.id}
        ${item.store?.name || ""}
        ${item.branch?.name || ""}
        ${item.user?.name || ""}
        ${item.bill_no || ""}
        ${item.subtotal || ""}
        ${item.total_gst || ""}
        ${item.total_amount || ""}
        ${item.total_saved || ""}
        ${item.total_cogs || ""}
        ${item.total_profit || ""}
        ${item.cash_received || ""}
        ${item.balance_return || ""}
        ${item.payment_status || ""}
        ${item.bill_status || ""}
        ${formattedDate}
      `.toLowerCase();

      const matchesSearch = searchable.includes(searchText);

      return matchesDate && matchesSearch;
    });

    setFilteredData(result);
  }, [search, selectedDate, saleBills]);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [["Bill No", "Subtotal", "GST", "Amount", "Profit"]],
      body: filteredData.map((row) => [
        row.bill_no,
        row.subtotal,
        row.total_gst,
        row.total_amount,
        row.total_profit,
      ]),
    });
    doc.save("sales_report.pdf");
  };

  const formatExportData = (data) => {
    return data.map((row) => ({
      ...row,
      bill_no: `'${row.bill_no}`,
      subtotal: parseFloat(row.subtotal || 0).toFixed(2),
      total_gst: parseFloat(row.total_gst || 0).toFixed(2),
      total_amount: parseFloat(row.total_amount || 0).toFixed(2),
      total_profit: parseFloat(row.total_profit || 0).toFixed(2),
      created_at: new Date(row.created_at).toLocaleString("en-IN"),
    }));
  };

  const csvHeaders = [
    { label: "Bill No", key: "bill_no" },
    { label: "Subtotal", key: "subtotal" },
    { label: "Total GST", key: "total_gst" },
    { label: "Total Amount", key: "total_amount" },
    { label: "Total Profit", key: "total_profit" },
    { label: "Date", key: "created_at" },
  ];

  // Calculate Summary Stats
  const stats = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        totalBills: acc.totalBills + 1,
        totalProfit: acc.totalProfit + Number(curr.total_profit || 0),
        totalRevenue: acc.totalRevenue + Number(curr.total_amount || 0),
      }),
      { totalBills: 0, totalProfit: 0, totalRevenue: 0 },
    );
  }, [filteredData]);

  const columns = [
    { name: "Id", selector: (row) => row.id, sortable: true, width: "70px" },
       {
      name: "Action",
      button: true,
      cell: (row) => (
        <button
          onClick={() => handlePrint(row.id)}
          title="Print"
          className="flex items-center justify-center text-black w-[36px] h-[36px] rounded"
        >
          <Printer size={18} />
        </button>
      ),
    },
        {
      name: "Payment",
      button: true,
      cell: (row) => (
        <button
          onClick={() => openPaymentModal(row)}
          title="Edit Payment"
          className="flex items-center justify-center bg-green-400 text-white w-[28px] h-[28px] rounded"
        >
          <Wallet size={18} />
        </button>
      ),
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          User Name
        </div>
      ),
      selector: (row) => row.user?.name,
      sortable: true,
      wrap: true,
    },
    {
      name: "Bill No",
      selector: (row) => row.bill_no,
      sortable: true,
      wrap: true,
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Created At
        </div>
      ),
      selector: (row) => new Date(row.created_at).toLocaleString("en-IN"),
      sortable: true,
      wrap: true,
    },
    {
      name: "Subtotal",
      selector: (row) => row.subtotal,
      sortable: true,
      wrap: true,
      cell: (row) => `₹${row.subtotal}`,
    },
    {
      name: "Total Gst",
      selector: (row) => row.total_gst,
      sortable: true,
      wrap: true,
      cell: (row) => `₹${row.total_gst}`,
    },
    // {
    //   name: (
    //     <div
    //       style={{
    //         whiteSpace: "normal",
    //         wordBreak: "break-word",
    //         textAlign: "center",
    //         lineHeight: "1.2",
    //       }}
    //     >
    //       Total Amount
    //     </div>
    //   ),
    //   selector: (row) => row?.total_amount,
    //   sortable: true,
    //   wrap: true,
    // },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Total Saved
        </div>
      ),
      selector: (row) => row.total_saved,
      sortable: true,
      wrap: true,
      cell: (row) => `₹${row.total_saved}`,
    },
    // {
    //   name: (
    //     <div
    //       style={{
    //         whiteSpace: "normal",
    //         wordBreak: "break-word",
    //         textAlign: "center",
    //         lineHeight: "1.2",
    //       }}
    //     >
    //       Total Cogs
    //     </div>
    //   ),
    //   selector: (row) => row.total_cogs,
    //   sortable: true,
    //   wrap: true,
    // },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Total Profit
        </div>
      ),
      selector: (row) => row.total_profit,
      sortable: true,
      wrap: true,
      cell: (row) => `₹${row.total_profit}`,
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Cash Received
        </div>
      ),
      selector: (row) => row.cash_received,
      sortable: true,
      wrap: true,
      cell: (row) => `₹${row.cash_received}`,
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Online Received
        </div>
      ),
      selector: (row) => row.online_received,
      sortable: true,
      wrap: true,
      cell: (row) => `₹${row.online_received}`,
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Due Amount
        </div>
      ),
      selector: (row) => row.due_amount,
      sortable: true,
      wrap: true,
      cell: (row) => (
        <span
          className={
            Number(row.due_amount) > 0 ? "text-red-600 font-semibold" : ""
          }
        >
          ₹{row.due_amount}
        </span>
      ),
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Balance Return
        </div>
      ),
      selector: (row) => Number(row.balance_return || 0),
      sortable: true,
      wrap: true,
      cell: (row) => `₹${Number(row.balance_return || 0).toFixed(2)}`,
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Payment Status
        </div>
      ),
      selector: (row) => row.payment_status,
      sortable: true,
      wrap: true,
    },
    {
      name: (
        <div
          style={{
            whiteSpace: "normal",
            wordBreak: "break-word",
            textAlign: "center",
            lineHeight: "1.2",
          }}
        >
          Bill Status
        </div>
      ),
      selector: (row) => row.bill_status,
      sortable: true,
      wrap: true,
    },
  ];

  const handlePrint = async (billId) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/sales-bill/print-data`,
        { id: [billId] },
        { headers: getAuthHeader() },
      );

      if (res.data?.status && res.data?.data?.length > 0) {
        setPrintData({ data: res.data.data });
        setShowReceipt(true);
      } else {
        alert("No print data found");
      }
    } catch (error) {
      console.error("Print failed:", error);
      alert("Unable to print bill");
    }
  };

  const printReceipt = () => {
    const printContent = receiptRef.current;
    const win = window.open("", "", "width=800,height=600");

    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            @page { size: auto; margin: 15mm 10mm 10mm 10mm; }
            body { margin: 0; padding: 0; font-family: "Poppins", sans-serif; }
            .receipt-print { margin-top: 12mm; }
            hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
          </style>
        </head>
        <body>
          <div class="receipt-print">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

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
                    Sales Bills
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    View and manage bills issued to your customers
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
                  <div className="text-tiny">Sale Bills</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Sale Bills</div>
              </li>
            </ul>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-6 gap-4 mb-8">
            <div
              className="wg-box p-4 mb-4 text-center"
              style={{ background: "#ECFDF5", border: "1px solid #94e7c0" }}
            >
              <h6>Total Bills</h6>
              <h3>{stats.totalBills}</h3>
            </div>
            <div
              className="wg-box p-4 mb-4 text-center"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <h6>Total Revenue</h6>
              <h3>₹{stats.totalRevenue.toFixed(2)}</h3>
            </div>
            <div
              className="wg-box p-4 mb-4 text-center"
              style={{ background: "#FFFBEB", border: "1px solid #f6e7ab" }}
            >
              <h6>Total Profit</h6>
              <h3>₹{stats.totalProfit.toFixed(2)}</h3>
            </div>
          </div>

          {/* Table Container */}
          <div className="wg-box">
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              {/* Text Search Bar */}
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search sales bills..."
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

              {/* Date Filter Controls */}
              <div className="px-4 py-4 flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate || ""}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-4 border rounded text-2xl"
                />

                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Clear Date
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {/* CSV/Excel Export */}
                <button
                  onClick={formatExportData(filteredData)}
                  title="Export as CSV"
                  className="flex items-center justify-center bg-green-500 text-white w-[44px] h-[44px] rounded-xl hover:bg-green-700 shadow-md"
                >
                  <FileSpreadsheet size={22} />
                </button>

                <button
                  onClick={exportPDF}
                  title="Export as PDF"
                  className="flex items-center justify-center bg-red-500 text-white w-[44px] h-[44px] rounded-xl hover:bg-red-700 shadow-md"
                >
                  <FileDown size={22} />
                </button>
              </div>
            </div>


            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              pointerOnHover
              responsive
            />
          </div>
        </div>
      </div>

      {showReceipt && printData && (
        <ReceiptModal
          ref={receiptRef}
          isOpen={showReceipt}
          data={printData}
          onClose={() => setShowReceipt(false)}
          onPrint={printReceipt}
        />
      )}

      {showPaymentModal && (
        <PaymentEditModal
          bill={selectedBill}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchSaleBill();
          }}
        />
      )}
    </Layout>
  );
};

export default SaleBill;
