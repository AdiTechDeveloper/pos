import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import axios from "axios";
import Layout from "../layout";
import { Link } from "react-router-dom";

const StockExpiryReport = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const customStyles = {
    headCells: {
      style: {
        fontWeight: "bold",
        fontSize: "14px",
      },
    },
    rows: {
      style: {
        fontSize: "15px",
        minHeight: "56px",
      },
    },
    cells: {
      style: {
        fontSize: "15px",
      },
    },
  };

  // Fetch API
  const fetchData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/reports/expiry-details`, {
        headers: {
          Authorization: `Bearer ${user_data.token}`,
        },
      });

      if (res.data.success) {
        setData(res.data.data);
        setFilteredData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const text = search.toLowerCase();

    const result = data.filter((item) => {
      const searchString = `
        ${item.product_name}
        ${item.batch_no}
        ${item.expiry_date}
        ${item.remaining_qty}
      `.toLowerCase();

      return searchString.includes(text);
    });

    setFilteredData(result);
  }, [search, data]);

  // Expiry Status Logic
  const getStatus = (date) => {
    const today = new Date();
    const expiry = new Date(date);
    const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { label: "Expired", class: "bg-danger" };
    if (diff <= 7) return { label: "Critical", class: "bg-warning" };
    if (diff <= 30) return { label: "Near Expiry", class: "bg-info" };

    return { label: "Safe", class: "bg-success" };
  };

  const columns = [
    {
      name: "ID",
      cell: (row, index) => (currentPage - 1) * perPage + index + 1,
      width: "80px",
      center: true,
    },
    {
      name: "Product",
      selector: (row) => row.product_name,
      sortable: true,
      minWidth: "220px",
    },
    {
      name: "Batch No",
      sortable: true,
      selector: (row) => row.batch_no,
      minWidth: "180px",
    },
    {
      name: "Expiry Date",
      sortable: true,
      selector: (row) => row.expiry_date,
      sortable: true,
      width: "140px",
    },
    {
      name: "Qty",
      selector: (row) => row.remaining_qty,
      sortable: true,
      width: "90px",
      center: true,
    },
    {
      name: "Status",
      sortable: true,
      center: true,
      width: "140px",
      cell: (row) => {
        const status = getStatus(row.expiry_date);
        return (
          <span className={`status-badge ${status.class}`}>{status.label}</span>
        );
      },
    },
  ];

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Header */}
          <div className="flex items-center justify-between mb-27">
            <h3>Stock Expiry Report</h3>

            <ul className="breadcrumbs flex items-center gap10">
              <li>
                <Link to="/">Dashboard</Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>Reports</li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>Expiry</li>
            </ul>
          </div>

          {/* Main Box */}
          <div className="wg-box">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap10 flex-wrap">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search expiry stock..."
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
            </div>

            {/* Data Table */}
            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              paginationPerPage={perPage}
              onChangePage={(page) => setCurrentPage(page)}
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={customStyles}
            />

            <div className="divider"></div>
          </div>
        </div>

        <style>{`
        .status-badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          display: inline-block;
        }

        .bg-danger { background: #ef4444; }
        .bg-warning { background: #f59e0b; }
        .bg-info { background: #3b82f6; }
        .bg-success { background: #10b981; }
      `}</style>
      </div>
    </Layout>
  );
};

export default StockExpiryReport;
