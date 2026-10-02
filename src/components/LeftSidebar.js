import React, { useEffect, useState } from "react";
import { getCategories, getBrands } from "../utils/api";

const getAuthHeader = () => {
  const user_detail = localStorage.getItem("user_detail");
  const user = user_detail ? JSON.parse(user_detail) : null;
  const token = user?.token;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : {};
};

export default function LeftSidebar({
  selectedCategory,
  selectedBrand,
  setCategory,
  setBrand,
}) {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeBrand, setActiveBrand] = useState(null);
  const userDetailString = localStorage.getItem("user_detail");
  const user_detail = userDetailString ? JSON.parse(userDetailString) : null;
  const role = user_detail?.user?.role;

  const handleCategory = (id) => {
    setActiveCategory(id);
    setCategory(id);
  };

  const handleBrand = (id) => {
    setActiveBrand(id);
    setBrand(id);
  };

  useEffect(() => {
    setActiveCategory(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    setActiveBrand(selectedBrand);
  }, [selectedBrand]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // Agar api.js ke functions { signal } accept karte hain to StrictMode ki
    // pehli request cancel ho jayegi. Agar nahi karte to ye argument ignore
    // ho jata hai (koi nuksan nahi).
    getCategories({ signal })
      .then((res) => {
        if (!signal.aborted) setCategories(res.data.categories || []);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error("Categories fetch error", err);
      });

    getBrands({ signal })
      .then((res) => {
        if (!signal.aborted) setBrands(res.data.brands || []);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
        console.error("Brands fetch error", err);
      });

    // cleanup: StrictMode ke pehle run ko cancel / ignore karo
    return () => controller.abort();
  }, []);

  return (
    <div className="pos-sidebar">
      {/* HEADER */}
      {role !== "cashier" && (
        <div className="pos-sidebar-header">
          <a
            href="/dashboard"
            className="pos-back-button"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <span className="pos-back-icon">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </span>
            <span className="pos-back-text">Back to dashboard</span>
          </a>
        </div>
      )}

      <div className="p-8 border-b">
        <h2 className="text-4xl font-bold text-gray-800">Filters</h2>
        <p className="text-2xl text-gray-500 mt-1">Categories & Brands</p>
      </div>

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* CATEGORIES */}
        <div>
          <h3 className="text-3xl font-semibold text-gray-700 mb-20">
            Categories
          </h3>
          <div className="space-y-4">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => handleCategory(c.id)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold text-2xl transition-all duration-200
                  ${
                    activeCategory === c.id
                      ? "bg-blue-600 text-white shadow-xl transform scale-105"
                      : "bg-gray-100 hover:bg-blue-100 text-gray-700"
                  }
                `}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* BRANDS */}
        <div style={{ marginTop: "35px" }}>
          <h3 className="text-3xl font-semibold text-gray-700 mb-20">Brands</h3>
          <div className="space-y-4">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBrand(b.id)}
                className={`w-full text-left px-6 py-4 rounded-2xl font-bold text-2xl transition-all duration-200
                  ${
                    activeBrand === b.id
                      ? "bg-green-600 text-white shadow-xl transform scale-105"
                      : "bg-gray-100 hover:bg-green-100 text-gray-800"
                  }
                `}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}