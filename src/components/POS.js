import axios from "axios";
import React, { useState, useEffect } from "react";
import ProductList from "./ProductList";
import CartPanel from "./CartPanel";
import { toast } from "react-toastify";
import RegisterModal from "./OpenRegisterModal";

import "../../src/assets/css/pos.css";

export default function POSApp() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [cart, setCart] = useState([]);
  const [refreshProducts, setRefreshProducts] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const [role, setRole] = useState(null);
  const [adminBranches, setAdminBranches] = useState([]);

  const BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const getUserDetail = () => {
    const raw = localStorage.getItem("user_detail");

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const userObj = parsed.user || parsed;

    return {
      role: userObj.role,
      branchIds:
        userObj.branch_ids ||
        userObj.branches?.map((b) => b.id) ||
        [],
      token: parsed.token || userObj.token,
    };
  };

  useEffect(() => {
    const userDetail = getUserDetail();

    if (!userDetail) {
      console.warn("No user_detail found in localStorage!");
      return;
    }

    const { role, branchIds, token } = userDetail;

    setRole(role);

    /*
    |--------------------------------------------------------------------------
    | ADMIN
    |--------------------------------------------------------------------------
    */

    if (role === "admin") {
      axios
        .get(`${BASE_URL}/api/branches`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => {
          setAdminBranches(res.data.data || []);
        })
        .catch((err) => {
          console.error("Failed to fetch admin branches:", err);
          setAdminBranches([]);
        });

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | MANAGER / CASHIER
    |--------------------------------------------------------------------------
    */

    if (!branchIds || branchIds.length === 0) {
      console.error(
        "Could not find a valid branch_ids array in user_detail!",
      );
      return;
    }

    const branchId = branchIds[0];

    setSelectedBranchId(branchId);

    if (role !== "cashier") return;

    const checkStatus = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/api/staff/register-status`,
          {
            params: {
              branch_id: branchId,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.data.active === false) {
          setShowModal(true);
        }
      } catch (err) {
        console.error("Register status check failed:", err);
        toast.error("Could not verify register status.");
      }
    };

    checkStatus();
  }, [BASE_URL]);

  const triggerRefresh = () => {
    setRefreshProducts((prev) => !prev);
  };

  const addToCart = (product) => {
    console.log("========== ADD TO CART ==========");
    console.log("PRODUCT RECEIVED:", product);
    console.log("is_price_override:", product?.is_price_override);

    setCart((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.inventory_id === product.inventory_id &&
          item.selling_price === product.selling_price,
      );

      if (index !== -1) {
        const currentQtyInCart = prev[index].qty;

        if (currentQtyInCart + 1 > product.total_stock) {
          toast.error(
            `Only ${product.total_stock} units available for this batch`,
          );
          return prev;
        }

        const updated = [...prev];

        updated[index] = {
          ...updated[index],
          qty: currentQtyInCart + 1,
        };

        return updated;
      }

      if (product.total_stock < 1) {
        toast.error("Out of stock for this batch");
        return prev;
      }

      const cartItem = {
        ...product,
        qty: 1,
        cart_key: `${product.inventory_id}_${product.selling_price}`,
        is_pirce_override:
          Number(product?.is_price_override) === 1 ? 1 : 0,
      };

      return [...prev, cartItem];
    });
  };

  const handleProductSelection = (productOrGroup) => {
    if (
      Array.isArray(productOrGroup) &&
      productOrGroup.length > 1
    ) {
      setPopupData(productOrGroup);
      setShowPopup(true);
      return;
    }

    const item = Array.isArray(productOrGroup)
      ? productOrGroup[0]
      : productOrGroup;

    addToCart(item);
  };

  /*
  |--------------------------------------------------------------------------
  | ADMIN BRANCH SELECTION
  |--------------------------------------------------------------------------
  */

  if (role === "admin" && !selectedBranchId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h3 className="text-2xl font-bold mb-4">
            Select a Branch
          </h3>

          <p className="text-gray-500 mb-6">
            Choose a branch for POS Screen.
          </p>

          <select
            className="border p-3 rounded-lg text-lg"
            defaultValue=""
            onChange={(e) =>
              setSelectedBranchId(Number(e.target.value))
            }
          >
            <option value="" disabled>
              -- Select Branch --
            </option>

            {adminBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

 return (
  <div
    className="pos-shell"
    style={{
      position: "fixed",
      inset: 0,
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 390px",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: "#f6f8fb",
    }}
  >
    <RegisterModal
      isOpen={showModal}
      branchId={selectedBranchId}
      onRegisterOpened={() => setShowModal(false)}
    />

    {/* PRODUCT SECTION */}
    <div
      className="pos-products-section"
      style={{
        minWidth: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <ProductList
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        setSelectedCategory={setSelectedCategory}
        setSelectedBrand={setSelectedBrand}
        refreshProducts={refreshProducts}
        addToCart={addToCart}
        handleProductSelection={handleProductSelection}
        branchId={role === "admin" ? selectedBranchId : undefined}
      />
    </div>

    {/* CART SECTION */}
    <div
      className="pos-cart-section"
      style={{
        width: "430px",
        minWidth: "430px",
        height: "100%",
        overflow: "hidden",
        background: "#fff",
        borderLeft: "1px solid #e5e7eb",
      }}
    >
      <CartPanel
        cart={cart}
        setCart={setCart}
        triggerRefresh={triggerRefresh}
        onPriceUpdated={() =>
          setRefreshProducts((prev) => !prev)
        }
        branchId={role === "admin" ? selectedBranchId : undefined}
      />
    </div>
  </div>
);
}