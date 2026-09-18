import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import FormikDatePicker from "./FormikDatePicker";
import { useAppData } from "../context/AppDataContext";

const CreatePurchaseReplace = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const { id } = useParams();
  const history = useHistory();
  const appData = useAppData();
  const branches = appData?.managerBranches || [];
  const [suppliers, setSupplierBill] = useState([]);
  const [purchaseBills, setPurchaseBills] = useState([]);
  const [purchaseLines, setPurchaseLines] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseBillId, setPurchaseBillId] = useState("");
  const [newPurchaseBill, setNewPurchaseBill] = useState("");
  const [error, setError] = useState("");
  const [fieldValue, setFieldValue] = useState(() => () => {});
  const [activeRowIndex, setActiveRowIndex] = useState(null);
  const [products, setProducts] = useState([]);

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_purchase_replace_bill = localStorage.getItem(
    "purchase_replace_bills_create",
  );
  const incomingReplaceBill = store_purchase_replace_bill
    ? JSON.parse(store_purchase_replace_bill)
    : null;

  const [initialValues, setInitialValues] = useState({
    purchase_bill_id: "",
    supplier_id: "",
    branch_id: "",
    return_date: "",
    lines: [
      {
        purchase_line_id: "",
        qty: "",
      },
    ],
    new_items: [
      {
        product_id: "",
        qty: "",
        purchase_rate: "",
        mrp: "",
        selling_price: "",
        batch_no: "",
      },
    ],
  });

  useEffect(() => {
    if (incomingReplaceBill) {
      setInitialValues({
        purchase_bill_id:
          incomingReplaceBill.purchase_bill_id?.toString() || "",
        supplier_id: incomingReplaceBill.supplier_id?.toString() || "",
        branch_id: incomingReplaceBill.branch_id || "",
        return_date: incomingReplaceBill.return_date || "",
        lines: incomingReplaceBill.lines?.length
          ? incomingReplaceBill.lines.map((line) => ({
              purchase_bill_line_id: line.purchase_line_id?.toString() || "",
              qty: line.qty || "",
            }))
          : initialValues.lines,
        new_items: incomingReplaceBill.new_items?.length
          ? incomingReplaceBill.new_items.map((item) => ({
              product_id: item.product_id?.toString() || "",
              qty: item.qty || "",
              purchase_rate: item.purchase_rate || "",
              mrp: item.mrp || "",
              selling_price: item.selling_price || "",
              batch_no: item.batch_no || "",
            }))
          : initialValues.new_items,
      });
    }
  }, []);

  const fetchPurchaseBill = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/purchase-bill`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setPurchaseBills(response.data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBranch = () => {
    appData?.loadManagerBranches();
  };

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/products`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSupplierBill = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/suppliers`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setSupplierBill(response.data.suppliers);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchBranch();
    fetchSupplierBill();
    fetchPurchaseBill();
    fetchProduct();
  }, []);

  const handlePurchaseBillSelection = async (selectedBillId, setFieldValue) => {
    try {
      const billDetails = purchaseBills.find(
        (b) => b.id === parseInt(selectedBillId),
      );

      if (billDetails) {
        setFieldValue("branch_id", billDetails.branch_id?.toString() || "");
        setFieldValue("supplier_id", billDetails.supplier_id?.toString() || "");

        const response = await axios.get(`${BASE_URL}/api/purchase-line`, {
          params: { purchase_bill_id: selectedBillId },
          headers: { Authorization: `Bearer ${user_data.token}` },
        });

        const apiLines = response.data.data;

        const filteredLines = apiLines.filter(
          (line) =>
            line.purchase_bill_id == selectedBillId ||
            line.purchase_id == selectedBillId,
        );

        const formattedLines = filteredLines.map((line) => ({
          purchase_bill_line_id: line.id.toString(),
          qty: line.qty,
          product_id: line.product_id,
          purchase_rate: line.purchase_rate,
          mrp: line.inventory?.mrp || "",
          selling_price: line.inventory?.selling_price || "",
          batch_no: line.batch_no,
        }));

        setFieldValue("lines", formattedLines);

        setPurchaseLines(filteredLines);
      }
    } catch (error) {
      console.error("Error fetching bill lines:", error);
      toast.error("Failed to load bill items");
    }
  };

  // Validation Schema
  const validationSchema = Yup.object().shape({
    purchase_bill_id: Yup.string().required("Purchase Bill Id is required"),
    branch_id: Yup.string().required("Branch is required"),
    supplier_id: Yup.string().required("Supplier is required"),
    return_date: Yup.string().required("Return Date is required"),
    lines: Yup.array()
      .min(1, "At least one product is required")
      .of(
        Yup.object().shape({
          purchase_bill_line_id: Yup.string().required(
            "Purchase Bill Product name and batch no. is required",
          ),
          product_id: Yup.string().required("Product is required"),
          qty: Yup.number()
            .required("Quantity is required")
            .positive("Must be positive")
            .integer("Must be an integer"),
        }),
      ),
  });

  const handleSubmit = async (values, actions) => {
    try {
      const firstLine = values.lines[0];
      const newItem = values.lines[0];

      const payload = {
        purchase_bill_id: values.purchase_bill_id,
        supplier_id: values.supplier_id,
        branch_id: values.branch_id,
        return_date: values.return_date,

        return_line: {
          purchase_bill_line_id: firstLine.purchase_bill_line_id,
          qty: firstLine.return_qty,
        },

        new_item: {
          product_id: firstLine.product_id,
          qty: firstLine.new_qty,
          purchase_rate: firstLine.purchase_rate,
          mrp: firstLine.mrp,
          selling_price: firstLine.selling_price,
          batch_no: firstLine.batch_no,
        },
      };

      const response = await axios.post(
        `${BASE_URL}/api/purchase-replacement`,
        payload,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      toast.success("Purchase Replacement Saved Successfully!");
      actions.resetForm();
      history.push("/purchase-return-bill");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Something went wrong";
      toast.error(errorMessage);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">Create Purchase Replace</h3>

          <div className="wg-box" style={{ width: "100%" }}>
            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={(values, actions) => handleSubmit(values, actions)}
            >
              {({ values, setFieldValue }) => (
                <Form>
                  <div className="container">
                    <div className="row mb-20">
                      <div className="mb-20 col-md-6">
                        <label className="mb-8 purchase-label">
                          Purchase Bill No
                        </label>
                        <Field
                          as="select"
                          name="purchase_bill_id"
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldValue("purchase_bill_id", val);
                            if (val) {
                              handlePurchaseBillSelection(val, setFieldValue);
                            } else {
                              setFieldValue("lines", []);
                            }
                          }}
                        >
                          <option value="">Select Purchase Bill</option>
                          {purchaseBills?.map((b) => (
                            <option value={b.id} key={b.id}>
                              {b.bill_no}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="purchase_bill_id"
                          className="error-text"
                          component="div"
                        />
                      </div>
                      <div className="mb-20 col-md-6">
                        <label className="mb-8 purchase-label">Branch</label>
                        <Field as="select" name="branch_id" className="mb-6">
                          <option value="">Select Branch</option>
                          {branches?.map((b) => (
                            <option value={b.id} key={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="branch_id"
                          className="error-text"
                          component="div"
                        />
                      </div>
                      <div className="mb-20 col-md-6">
                        <label className="mb-8 purchase-label">Supplier</label>
                        <Field as="select" name="supplier_id" className="mb-6">
                          <option value="">Select Supplier</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage
                          name="supplier_id"
                          className="error-text"
                          component="div"
                        />
                      </div>

                      <div className="mb-20 col-md-6">
                        <label
                          className="mb-8 purchase-label"
                          style={{ fontSize: "15px", display: "block" }}
                        >
                          Replace Date
                        </label>
                        <FormikDatePicker
                          type="date"
                          name="return_date"
                          className="mb-6"
                        />
                        <ErrorMessage
                          name="return_date"
                          className="error-text"
                          component="div"
                        />
                      </div>
                    </div>
                  </div>
                  <FieldArray name="lines">
                    {({ push, remove }) => (
                      <>
                        {values?.lines?.map((line, index) => (
                          <div
                            key={index}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "20px",
                              marginBottom: "16px",
                              backgroundColor: "#ffffff",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                              position: "relative",
                              borderLeft: "4px solid #3b82f6",
                            }}
                          >
                            {/* Header for the Row */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "15px",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "600",
                                  fontSize: "16px",
                                  uppercase: "true",
                                }}
                              >
                                ITEM REPLACEMENT #{index + 1}
                              </span>
                              <button
                                type="button"
                                className="text-danger-600 hover:text-danger-700"
                                style={{
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  fontSize: "16px",
                                }}
                                onClick={() => remove(index)}
                              >
                                ✕ Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-12 gap-4">
                              {/* LEFT COLUMN: SOURCE (The original purchase) */}
                              <div
                                className="col-span-12 lg:col-span-4"
                                style={{
                                  borderRight: "1px dashed #e2e8f0",
                                  paddingRight: "15px",
                                }}
                              >
                                <label className="block text-2xl font-medium text-gray-700 mb-1">
                                  Source Batch (Return)
                                </label>
                                <Field
                                  name={`lines.${index}.purchase_bill_line_id`}
                                >
                                  {({ field, form }) => (
                                    <select
                                      {...field}
                                      className="form-select w-full text-2xl py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      onChange={(e) => {
                                        const lineId = e.target.value;
                                        form.setFieldValue(field.name, lineId);
                                        const selectedLine = purchaseLines.find(
                                          (p) => p.id.toString() === lineId,
                                        );
                                        if (selectedLine) {
                                          form.setFieldValue(
                                            `lines.${index}.product_id`,
                                            selectedLine.product_id,
                                          );
                                          form.setFieldValue(
                                            `lines.${index}.purchase_rate`,
                                            selectedLine.inventory
                                              ?.cost_price || "",
                                          );
                                          form.setFieldValue(
                                            `lines.${index}.mrp`,
                                            selectedLine.inventory?.mrp || "",
                                          );
                                          form.setFieldValue(
                                            `lines.${index}.selling_price`,
                                            selectedLine.inventory
                                              ?.selling_price || "",
                                          );
                                          form.setFieldValue(
                                            `lines.${index}.return_qty`,
                                            selectedLine.qty,
                                          );
                                        }
                                      }}
                                    >
                                      <option value="">
                                        Select Batch/Product
                                      </option>
                                      {purchaseLines.map((p) => (
                                        <option value={p.id} key={p.id}>
                                          {p.batch_no} — {p.product?.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </Field>

                                <div className="mt-3">
                                  <label className="block text-2xl font-medium text-gray-700 mt-2">
                                    Return Qty
                                  </label>
                                  <Field
                                    type="number"
                                    name={`lines.${index}.return_qty`}
                                    className="form-control w-full bg-light"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>

                              {/* RIGHT COLUMN: REPLACEMENT (The new stock details) */}
                              <div className="col-span-12 lg:col-span-8">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="col-span-2">
                                    <label className="block text-2xl font-medium text-gray-700 mb-1">
                                      Replacement Product
                                    </label>
                                    <Field
                                      as="select"
                                      name={`lines.${index}.product_id`}
                                      className="form-select w-full text-2xl py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="">Select Product</option>
                                      {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}
                                        </option>
                                      ))}
                                    </Field>
                                  </div>

                                  <div>
                                    <label className="block text-2xl font-medium text-gray-700 mb-2 mt-2">
                                      New Qty
                                    </label>
                                    <Field
                                      type="number"
                                      name={`lines.${index}.new_qty`}
                                      className="form-control w-full"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-2xl font-medium text-gray-700 mb-2 mt-2">
                                      Rate
                                    </label>
                                    <Field
                                      type="number"
                                      name={`lines.${index}.purchase_rate`}
                                      className="form-control w-full"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-2xl font-medium text-gray-700 mb-2 mt-2">
                                      MRP
                                    </label>
                                    <Field
                                      type="number"
                                      name={`lines.${index}.mrp`}
                                      className="form-control w-full"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-2xl font-medium text-gray-700 mb-2 mt-2">
                                      New SP
                                    </label>
                                    <Field
                                      type="number"
                                      name={`lines.${index}.selling_price`}
                                      className="form-control w-full"
                                      placeholder="0.00"
                                    />
                                  </div>

                                  <div className="col-span-3">
                                    <label className="block text-2xl font-medium text-gray-700 mb-2 mt-2">
                                      New Batch Number
                                    </label>
                                    <Field
                                      type="text"
                                      name={`lines.${index}.batch_no`}
                                      className="form-control w-full"
                                      placeholder="Auto-generate or enter batch..."
                                      style={{ backgroundColor: "#fdfcf0" }} // Slight tint to show it's a new entry
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="btn btn-outline-primary text-2xl"
                          style={{
                            border: "2px dashed #cbd5e1",
                            // width: "100%",
                            padding: "12px",
                            borderRadius: "8px",
                            fontWeight: "600",
                          }}
                          onClick={() =>
                            push({
                              purchase_bill_line_id: "",
                              return_qty: "",
                              new_qty: "",
                              product_id: "",
                              purchase_rate: "",
                              mrp: "",
                              selling_price: "",
                              batch_no: "",
                            })
                          }
                        >
                          + Add Another Replacement Row
                        </button>
                      </>
                    )}
                  </FieldArray>

                  <div className="flex col">
                    <button
                      type="submit"
                      className="mt-20 btn btn-success text-2xl w-md p-2"
                    >
                      Save Replace Bill
                    </button>

                    <button type="button" className="ml-5">
                      <a href="/purchase-return-bill"> Cancel</a>
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreatePurchaseReplace;
