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
    getCategories().then((res) => setCategories(res.data.categories || []));
    getBrands().then((res) => setBrands(res.data.brands || []));
  }, []);

  return (
    <div className="w-80 bg-gray-50 h-screen border-r shadow-lg flex flex-col">
      {/* HEADER */}
      {role !== "cashier" && (
        <div className="p-8 border-b">
          <a href="/dashboard">
            <p className="font-size-24px font-bold text-gray-800">
              {" "}
              ⬅️ Back To Dashboard
            </p>
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
