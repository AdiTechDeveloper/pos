import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import { toast } from "react-toastify";

const PurchaseBill = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [purchaseBill, setPurchaseBill] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
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
        fetchPurchaseBill();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete purchase bill.",
      );
    }
  };

  const columns = [
    {
      name: "ID",
      cell: (row, index) => (currentPage - 1) * perPage + index + 1,
      width: "60px",
    },
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
          <span
            className="item trash"
            title="Delete"
            onClick={() => handleDeleteConfirm(row.id)}
          >
            <i className="icon-trash-2" />
          </span>
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

  const fetchPurchaseBill = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/purchase-bill`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setPurchaseBill(response.data.data);
    } catch (error) {
      console.error("Error fetching purchase bills:", error);
    }
  };

  useEffect(() => {
    fetchPurchaseBill();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();
    const result = purchaseBill.filter((item) => {
      const searchable = `
        ${item.id}
        ${item.branch?.name}
        ${item.supplier?.name}
        ${item.inward_no}
        ${item.bill_no}
        ${item.bill_date}
        ${item.taxable_value}
        ${item.cgst_amount}
        ${item.sgst_amount}
        ${item.igst_amount}
        ${item.cess_amount}
        ${item.total_tax}
        ${item.total_amount}
        ${item.settlement_amount}
      `.toLowerCase();
      return searchable.includes(searchText);
    });
    setFilteredData(result);
  }, [search, purchaseBill]);

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
              data={filteredData}
              pagination
              paginationPerPage={perPage}
              onChangePage={(page) => setCurrentPage(page)}
              highlightOnHover
              pointerOnHover
              responsive
              customStyles={{
                headCells: {
                  style: {
                    fontWeight: "bold",
                    fontSize: "12px",
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

export default PurchaseBill;
