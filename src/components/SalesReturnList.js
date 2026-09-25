import React, { useEffect, useState } from "react";
import Layout from "./layout";
import DataTable from "react-data-table-component";
import { Link } from "react-router-dom";
import axios from "axios";

const ExpandedComponent = ({ data }) => {
  const lineColumns = [
    { name: "Product ID", selector: (row) => row.product_id, sortable: true },
    { name: "Qty", selector: (row) => row.qty, sortable: true },
    { name: "Rate", selector: (row) => `₹${row.rate}`, sortable: true },
    { name: "Tax (GST)", selector: (row) => `₹${row.total_gst}` },
    {
      name: "Total Amount",
      selector: (row) => `₹${row.amount}`,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row) => (row.is_damaged ? "⚠️ Damaged" : "✅ OK"),
    },
  ];

  return (
    <div
      style={{
        padding: "15px 25px",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #e9ecef",
      }}
    >
      <h5 className="mb-2" style={{ fontSize: "14px", fontWeight: "bold" }}>
        Return Items Detail:
      </h5>
      <DataTable columns={lineColumns} data={data.return_lines || []} dense />
    </div>
  );
};

const SalesReturnList = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [search, setSearch] = useState("");
  const [salesReturn, setSalesReturn] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const user_detail = localStorage.getItem("user_detail");
  const user_data = user_detail ? JSON.parse(user_detail) : null;

  const handleCreateSalesReturn = () => {
    localStorage.setItem("sales_return_create", null);
  };

  const columns = [
    {
      name: "Id",
      selector: (row) => row.id,
      sortable: true,
      width: "70px",
    },
    {
      name: "Return No",
      selector: (row) => row.return_no,
      sortable: true,
      width: "180px",
    },
    {
      name: "Original Bill No",
      selector: (row) => row.sales_bill?.bill_no || "N/A",
      sortable: true,
      width: "180px",
    },
    {
      name: "Customer",
      selector: (row) => row.customer?.name || "Walk-in Customer",
      sortable: true,
    },
    {
      name: "Refund Amount",
      selector: (row) => `₹${row.total_refund_amount}`,
      sortable: true,
    },
    {
      name: "Refund Type",
      selector: (row) => row.refund_type?.toUpperCase(),
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => new Date(row.created_at).toLocaleDateString("en-IN"),
      sortable: true,
    },
  ];

  const fetchSaleReturn = async () => {
    if (!user_data?.token) return;
    try {
      const response = await axios.get(`${BASE_URL}/api/sales-return`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      const dataResult = response.data.data.data || response.data.data;
      setSalesReturn(dataResult);
    } catch (error) {
      console.error("Error fetching sales returns:", error);
    }
  };

  useEffect(() => {
    fetchSaleReturn();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();

    const result = salesReturn.filter((item) => {
      const formattedDate = new Date(item.created_at).toLocaleDateString(
        "en-CA",
      );
      const billNo = item.sales_bill?.bill_no || "";
      const returnNo = item.return_no || "";
      const customerName = item.customer?.name || "walk-in";
      const amount = item.total_refund_amount || "";
      const refundType = item.refund_type || "";

      const searchable = `
        ${item.id}
        ${formattedDate}
        ${billNo}
        ${returnNo}
        ${customerName}
        ${amount}
        ${refundType}
      `.toLowerCase();

      return searchable.includes(searchText);
    });

    setFilteredData(result);
  }, [search, salesReturn]);

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
                    Sales Return
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                  Track and manage products returned by customers
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
                  <div className="text-tiny">Sale Return</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Sale Returns</div>
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
                      placeholder="Search return bills, original bills, dates..."
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
                to="/sales-bill/return"
                onClick={handleCreateSalesReturn}
              >
                <i className="icon-plus"></i>Add new
              </Link>
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              pointerOnHover
              responsive
              expandableRows
              expandableRowsComponent={ExpandedComponent}
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

export default SalesReturnList;
