import React, { useState, useEffect } from "react";
import Layout from "./layout";
import { Link } from "react-router-dom";
import DataTable from "react-data-table-component";
import axios from "axios";

const BrachStaff = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [search, setSearch] = useState("");
  const [brands, setBrands] = useState([]);
  const [filteredData, setFilteredData] = useState(brands);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const fetchBranchStaff = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/brands`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setBrands(response.data.brands);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };
  useEffect(() => {
    fetchBranchStaff();
  }, []);

  useEffect(() => {
    const result = brands.filter((item) => {
      return Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    });

    setFilteredData(result);
  }, [search, brands]);

  const columns = [
    {
      name: "Id",
      selector: (row) => row.id,
      sortable: true,
    },
    {
      name: "Store Name",
      selector: (row) => row?.store?.name,
      sortable: true,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Description",
      selector: (row) => row.description,
      sortable: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="list-icon-function">
          <div className="item eye">
            <i className="icon-eye"></i>
          </div>
          <div className="item edit">
            <i className="icon-edit-3"></i>
          </div>
          <div className="item trash">
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
            <h3>All Brands</h3>
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
                  <div className="text-tiny">Brand</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Brand</div>
              </li>
            </ul>
          </div>
          <div className="wg-box">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                marginBottom: "10px",
                padding: "8px",
                width: "250px",
              }}
            />
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
export default BrachStaff;
