import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import Layout from "./layout";
import { toast } from "react-toastify";
import FormikDatePicker from "./FormikDatePicker";
import { useAppData } from "../context/AppDataContext";

const CreateEditPurchaseReturn = () => {
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

  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const store_purchase_return_bill = localStorage.getItem(
    "purchase_return_bills_create",
  );
  const incomingReturnBill = store_purchase_return_bill
    ? JSON.parse(store_purchase_return_bill)
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
  });

  useEffect(() => {
    if (incomingReturnBill) {
      setInitialValues({
        purchase_bill_id: incomingReturnBill.purchase_bill_id?.toString() || "",
        supplier_id: incomingReturnBill.supplier_id?.toString() || "",
        branch_id: incomingReturnBill.branch_id || "",
        return_date: incomingReturnBill.return_date || "",
        lines: incomingReturnBill.lines?.length
          ? incomingReturnBill.lines.map((line) => ({
              purchase_bill_line_id: line.purchase_line_id?.toString() || "",
              qty: line.qty || "",
            }))
          : initialValues.lines,
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

  const fetchPurchaseLine = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/purchase-line`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${user_data.token}`,
        },
      });
      setPurchaseLines(response.data.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBranch = () => {
    appData?.loadManagerBranches();
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
    // fetchPurchaseLine();
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
      const response = await axios.post(
        `${BASE_URL}/api/purchase-return`,
        values,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${user_data.token}`,
          },
        },
      );

      toast.success("Purchase Return Saved Successfully!");

      actions.resetForm();

      history.push("/purchase-return-bill");
    } catch (error) {
      console.error("API Error:", error.response?.data);
      const errorMessage =
        error.response?.data?.message || "Something went wrong while saving";
      toast.error(errorMessage);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <h3 className="mb-20">Create Purchase Return Bill</h3>

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
                      <div className="mb-20 col-md-2">
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
                      <div className="mb-20 col-md-2">
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
                      <div className="mb-20 col-md-2">
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

                      <div className="mb-20 col-md-2">
                        <label
                          className="mb-8 purchase-label"
                          style={{ fontSize: "15px", display: "block" }}
                        >
                          Return Date
                        </label>
                        <FormikDatePicker
                          name="return_date"
                          placeholder="dd-mm-yyyy"
                          className="form-control"
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
                              border: "1px solid #ccc",
                              padding: 10,
                              marginBottom: 12,
                            }}
                          >
                            <div className="line-row">
                              <div className="line-col">
                                <label
                                  className="mb-8 mt-12"
                                  style={{
                                    fontSize: "15px",
                                    marginTop: "12px",
                                  }}
                                >
                                  Batch no
                                </label>
                                <Field
                                  as="select"
                                  name={`lines.${index}.purchase_bill_line_id`}
                                >
                                  <option value="">Select Purchase Line</option>
                                  {purchaseLines.map((p) => (
                                    <option value={p.id} key={p.id}>
                                      {p.batch_no} ({p.product?.name})
                                    </option>
                                  ))}
                                </Field>
                                <ErrorMessage
                                  name={`lines.${index}.purchase_bill_line_id`}
                                  className="error-text"
                                  component="div"
                                />
                              </div>

                              <div className="line-col">
                                <label style={{ fontSize: "15px" }}>Qty</label>
                                <Field
                                  type="number"
                                  name={`lines.${index}.qty`}
                                  placeholder="Enter quantity to return"
                                />
                                <ErrorMessage
                                  name={`lines.${index}.qty`}
                                  className="error-text"
                                  component="div"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => remove(index)}
                              >
                                Delete
                              </button>
                                <button
                          type="button"
                          className="ml-5 tf-button style-1"
                          style={{ color: "inherit", textDecoration: "none" }} 
                          onClick={() =>
                            push({ purchase_bill_line_id: "", qty: "" })
                          }
                        >
                          + Add Product
                        </button>
                            </div>
                          </div>
                        ))}
      
                        {/* <button
                          type="button"
                          className="ml-5 tf-button style-1"
                          style={{ color: "inherit", textDecoration: "none" }} 
                          onClick={() =>
                            push({ purchase_bill_line_id: "", qty: "" })
                          }
                        >
                          + Add Product
                        </button> */}
                      </>
                    )}
                  </FieldArray>
            <div className="flex">
                  <button type="submit" className="ml-5 tf-button style-1" style={{ color: "inherit", textDecoration: "none" }} >Save Return Bill</button>
                  <button type="button"  className="ml-5 tf-button style-1">
                    <a href="/purchase-return-bill" style={{ color: "inherit", textDecoration: "none" }} > Cancel</a>
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

export default CreateEditPurchaseReturn;
