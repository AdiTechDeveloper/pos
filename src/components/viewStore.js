import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Layout from "./layout";

const ViewStore = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const user_data = JSON.parse(localStorage.getItem("user_detail"));

  useEffect(() => {
    fetchStoreDetails();
  }, []);

  const fetchStoreDetails = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/stores/${id}`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      const data = response.data.data;
      const admin = Array.isArray(data.users)
        ? data.users.find((u) => u.role === "admin")
        : null;

      setStore({ ...data, admin });
    } catch (error) {
      toast.error("Failed to load store details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex items-center flex-wrap justify-between gap20 mb-27">
            <h3>Store Details</h3>

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
                <div className="text-tiny">Store Details</div>
              </li>
            </ul>
          </div>

          <div className="wg-box bg-white shadow-md rounded-lg p-6 max-w-md mx-auto">
            {/* Store Info */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {store?.name || "Store Name"}
              </h3>
              <div className="text-gray-600 space-y-1">
                <p>
                  <span className="font-semibold">Store Code:</span>{" "}
                  {store?.code || "-"}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {store?.phone || "-"}
                </p>
                <p>
                  <span className="font-semibold">State:</span>{" "}
                  {store?.state || "-"}
                </p>
                <p>
                  <span className="font-semibold">Address:</span>{" "}
                  {store?.address || "-"}
                </p>
              </div>
            </div>

            <hr className="border-gray-200 mb-6" />

            {/* Admin Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                Admin Details
              </h3>
              <div className="text-gray-600 space-y-1">
                <p>
                  <span className="font-semibold">Name:</span>{" "}
                  {store?.admin?.name || "-"}
                </p>
                <p>
                  <span className="font-semibold">Username:</span>{" "}
                  {store?.admin?.username || "-"}
                </p>
                <p>
                  <span className="font-semibold">Role:</span>{" "}
                  {store?.admin?.role || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ViewStore;
