import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

const Store = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const history = useHistory();
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState(stores);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleEdit = (row) => {
    history.push(`/create-store/${row.id}`, {
      storeData: row,
    });
  };

  const handleDeleteConfirm = (id) => {
    handleDelete(id);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This store will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(`${BASE_URL}/api/stores/${id}`, {
            headers: {
              Authorization: `Bearer ${user_data.token}`,
            },
          });

          toast.success(
            response.data?.message || "Store deleted successfully!",
          );

          fetchStore();
        } catch (error) {
          toast.error(
            error.response?.data?.message || "Failed to delete the store.",
          );
        }
      }
    });
  };

  const columns = [
    {
      name: "Store Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Logo",
      sortable: false,
      cell: (row) =>
        row.logo ? (
          <img
            src={`${BASE_URL}/storage/${row.logo}`}
            alt="Store Logo"
            className="w-40 h-15 object-cover mt-2"
          />
        ) : null,
    },
    {
      name: "Code",
      selector: (row) => row.code,
      sortable: true,
    },
    {
      name: "Contact Person",
      selector: (row) => row.contact_person_name,
      sortable: true,
    },
    {
      name: "GSTIN",
      selector: (row) => row.gstin,
      sortable: true,
    },
    {
      name: "Tag Line",
      selector: (row) => row.tagline,
      sortable: true,
    },
    {
      name: "Address",
      selector: (row) => row.address,
      sortable: true,
    },
    {
      name: "State",
      selector: (row) => row.state,
      sortable: true,
    },
    {
      name: "Phone",
      selector: (row) => row.phone,
      sortable: true,
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="list-icon-function">
          {/* <div
            className="item eye"
            onClick={() => history.push(`/stores/view/${row.id}`)}
          >
            <i className="icon-eye"></i>
          </div> */}
          <div className="item edit" onClick={() => handleEdit(row)}>
            <i className="icon-edit-3"></i>
          </div>
          <div
            className="item trash"
            onClick={() => handleDeleteConfirm(row.id)}
          >
            <i className="icon-trash-2"></i>
          </div>
        </div>
      ),
    },
  ];

  const fetchStore = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/stores`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
        withCredentials: true,
      });
      setStores(response.data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchStore();
  }, []);

  useEffect(() => {
    const result = stores.filter((item) => {
      return Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    });

    setFilteredData(result);
  }, [search, stores]);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          {/* Page header + Breadcrumbs */}
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>All Store</h3>

            <ul className="breadcrumbs flex items-center flex-wrap gap10">
              <li>
                <Link to="/dashboard">
                  <div className="text-tiny">Dashboard</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <Link to="/store">
                  <div className="text-tiny">Store</div>
                </Link>
              </li>
              <li>
                <i className="icon-chevron-right"></i>
              </li>
              <li>
                <div className="text-tiny">All Store</div>
              </li>
            </ul>
          </div>

          {/* Table Section */}
          <div className="wg-box">
            {/* TOP Search Box + Add Button */}
            <div className="flex items-center justify-between gap10 flex-wrap mb-3">
              <div className="wg-filter flex-grow">
                <form
                  className="form-search"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <fieldset className="name">
                    <input
                      type="text"
                      placeholder="Search here..."
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

              <Link className="tf-button style-1 w208" to="/create-store">
                <i className="icon-plus"></i>Add new
              </Link>
            </div>

            {/* DataTable */}
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
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Store;
