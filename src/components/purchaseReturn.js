import React, { useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import Layout from "./layout";

const PurchaseReturn = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [PurchaseReturn, setPurchaseReturn] = useState([]);
  const [filteredData, setFilteredData] = useState(products);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  const handleCreatePurchaseReturns = () => {
    localStorage.setItem("purchase_return_bills_create", null);
  };
  const handleEdit = (row) => {
    localStorage.setItem("purchase_return_bills_create", JSON.stringify(row));
  };

  const columns = [
    {
      name: "Id",
      selector: (row) => row.id,
      sortable: true,
      width: "100px",
    },
    {
      name: "Purchase Bill No",
      selector: (row) => row?.purchase_bill?.bill_no,
      sortable: true,
      wrap: true,
    },
    {
      name: "Branch Name",
      selector: (row) => row.branch.name,
      sortable: true,
      wrap: true,
    },
    {
      name: "Supplier Name",
      selector: (row) => row.supplier.name,
      sortable: true,
      wrap: true,
    },
    {
      name: "Return Date",
      selector: (row) => {
        const date = new Date(row.return_date);
        return date.toLocaleDateString("en-GB");
      },
      sortable: true,
      wrap: true,
    },
    {
      name: "Total Gst",
      selector: (row) => row.total_gst,
      sortable: true,
      wrap: true,
    },
    {
      name: "Total Amount",
      selector: (row) => row.total_amount,
      sortable: true,
      wrap: true,
    },
    {
      name: "Return Type",
      selector: (row) => row.return_type,
      sortable: true,
      wrap: true,
    },
  ];

  const fetchPurchaseReturn = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/purchase-return`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setPurchaseReturn(response.data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
  useEffect(() => {
    fetchPurchaseReturn();
  }, []);

  useEffect(() => {
    const searchText = search.toLowerCase();

    const result = PurchaseReturn.filter((item) => {
      const searchable = `
      ${item.id}
      ${item.branch?.name}
      ${item.supplier?.name}
      ${item.bill_no}
      ${item.bill_date}
      ${item.taxable_value}
      ${item.cgst_amount}
      ${item.sgst_amount}
      ${item.igst_amount}
      ${item.cess_amount}
      ${item.total_tax}
      ${item.total_amount}
    `.toLowerCase();
      return searchable.includes(searchText);
    });

    setFilteredData(result);
  }, [search, PurchaseReturn]);

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>All Purchase Return Bills</h3>
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
                      placeholder="Search purchase return bills..."
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
                to="/create-purchase-return-bill"
                onClick={handleCreatePurchaseReturns}
              >
                <i className="icon-plus"></i>Add Return Bill
              </Link>

              <Link
                className="tf-button style-1 w208"
                to="/create-purchase-replace"
              >
                <i className="icon-plus"></i>Add Replace Bill
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
export default PurchaseReturn;
