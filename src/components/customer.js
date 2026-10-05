import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";

const Customer = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/customers`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data?.token}`,
        },
      });

      const payload = response.data;
      let list = payload?.data ?? payload?.customers ?? payload;

      if (list && !Array.isArray(list) && Array.isArray(list.data)) {
        list = list.data;
      }

      setCustomers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error(error.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
    // {
    //   name: "Id",
    //   selector: (row) => row.id,
    //   sortable: true,
    //   width: "90px",
    // },
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
            </div>

            <DataTable
              columns={columns}
              data={filteredData}
              progressPending={loading}
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
