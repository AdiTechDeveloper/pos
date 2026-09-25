import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link, useHistory } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const GstRate = () => {
  const history = useHistory();
  const [search, setSearch] = useState("");
  const [gstRates, setGstRates] = useState([]);
  const [filteredData, setFilteredData] = useState(gstRates);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const fetchGstRate = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/gst-rates`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setGstRates(response.data.gstRates);
    } catch (error) {
      console.error("Error fetching gst Rates:", error);
    }
  };

  useEffect(() => {
    fetchGstRate();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();

    const result = gstRates.filter((item) => {
      return (
        item.rate.toLowerCase().includes(searchText) ||
        item.description.toLowerCase().includes(searchText)
      );
    });

    setFilteredData(result);
  }, [search, gstRates]);

  const handleCreateGstRates = () => {
    localStorage.setItem("gst_rate_detail", null);
  };
  const handleEdit = (row) => {
    localStorage.setItem("gst_rate_detail", JSON.stringify(row));
  };

  const handleDeleteConfirm = (id) => {
    if (window.confirm("Are you sure you want to delete this Gst Rate?")) {
      handleDelete(id);
    }
  };
  const handleDelete = async (id) => {
    const response = await axios.delete(`${BASE_URL}/api/gst-rates/${id}`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${user_data.token}`,
      },
    });
    if (response) {
      history.push("/gst-rates");
      toast.success("Gst Rates Deleted");
      fetchGstRate();
    }
  };
  const columns = [
    {
      name: "Id",
      selector: (row) => row.id,
      sortable: true,
      width: "100px",
    },
    {
      name: "Rate",
      selector: (row) => row.rate,
      sortable: true,
      width: "150px",
    },
    {
      name: "Description",
      selector: (row) => row.description,
      sortable: true,
      width: "180px",
    },
    {
      name: "Active",
      sortable: true,
      cell: (row) => {
        const isActive = row.active == 1;
        return (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              backgroundColor: isActive ? "#22c55e" : "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {isActive ? "✓" : "✕"}
          </div>
        );
      },
    },
      {
      name: "Action",
      cell: (row) => (
        <div className="list-icon-function">
          <div className="item edit" title="Edit">
            <Link
              to={`/gst-rates/edit/${row.id}`}
              onClick={() => handleEdit(row)}
            >
              <i className="icon-edit-3"></i>
            </Link>
          </div>
          <div
            className="item trash"
            title="Delete"
            onClick={() => handleDeleteConfirm(row.id)}
          >
            <i className="icon-trash-2"></i>
          </div>
        </div>
      ),
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
                    GST Rates
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "2px 0 0 0",
                    }}
                  >
                    Configure tax rates applied to your products and bills
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
                  <div className="text-tiny">Gst Rates</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Gst Rates</div>
              </li>
            </ul>
          </div>
          <div className="wg-box wg-gst-content" style={{ width: "60%" }}>
            <div className="flex items-center justify-between gap10 flex-wrap">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search gst rate..."
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
                to="/create-gst-rates"
                onClick={handleCreateGstRates}
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
export default GstRate;
