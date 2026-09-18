import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
axios.defaults.withCredentials = true;

const CashierLogin = () => {
  const BASE_URL = process.env.REACT_APP_API_BASE_URL;
  const history = useHistory();
  const [formData, setFormData] = useState({
    pin: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    let temp = {};

    if (!formData.pin) temp.pin = "Pin is required";

    setErrors(temp);

    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      console.log("Validation failed");
      return;
    }

    try {
      const response = await axios.post(`${BASE_URL}/api/login`, formData, {
        headers: {
          accept: "application/json",
        },
        withCredentials: true,
      });

      const user_detail = response.data;

      localStorage.setItem("user_detail", JSON.stringify(user_detail));

      toast.success(user_detail.message || "Login successful!");

      history.push("/pos");
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      if (err.response) {
        toast.error(err.response.data?.message || "Invalid credentials");
      } else if (err.request) {
        toast.error("Server not responding. Please try again.");
      } else {
        toast.error("Something went wrong.");
      }
    }
  };

  return (
    <div className="wrap-login-page">
      <div className="flex-grow flex flex-column justify-center gap30">
        <div className="login-box">
          <h3>Cashier Login Account</h3>
          <form
            className="form-login flex flex-column gap24"
            onSubmit={handleSubmit}
          >
            {/* PIN Login */}
            <fieldset className="pin">
              <div className="body-title mb-10">
                Cashier PIN <span className="tf-color-1">*</span>
              </div>
              <input
                type="text"
                placeholder="Enter your PIN"
                name="pin"
                value={formData.pin}
                onChange={handleChange}
              />
              {errors.pin && <small className="text-red">{errors.pin}</small>}
            </fieldset>

            <button type="submit" className="tf-button w-full">
              Login
            </button>
            {/* <div className="body-text text-center">
              Do not have account? please register here
              <Link to="/register" className="body-text tf-color">
                {" "}
                Register Now{" "}
              </Link>
            </div> */}
            <div className="body-text text-center">
              Please Login here
              <Link to="/login" className="body-text tf-color">
                {" "}
                Manager Login Now{" "}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default CashierLogin;
