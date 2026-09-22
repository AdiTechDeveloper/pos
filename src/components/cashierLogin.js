import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const TOKEN_KEY = "pos_device_token";

const setCookie = (name, value, days) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};
const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
};

const CashierLogin = () => {
  const history = useHistory();

  const [resolving, setResolving] = useState(true);
  const [terminal, setTerminal] = useState(null);
  const [setupMode, setSetupMode] = useState(false);

  const [authData, setAuthData] = useState({ username: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [tempSession, setTempSession] = useState(null);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const [formData, setFormData] = useState({ pin: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const resolveTerminal = async () => {
      const token = localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);

      if (!token) {
        setSetupMode(true);
        setResolving(false);
        return;
      }

      try {
        const res = await axios.post(`${BASE_URL}/api/pos-terminals/resolve`, {
          device_token: token,
        });
        const { branch_id, branch_name } = res.data;

        localStorage.setItem(TOKEN_KEY, token);
        setCookie(TOKEN_KEY, token, 3650);

        setTerminal({ device_token: token, branch_id, branch_name });
      } catch (err) {
        localStorage.removeItem(TOKEN_KEY);
        deleteCookie(TOKEN_KEY);
        setSetupMode(true);
      } finally {
        setResolving(false);
      }
    };

    resolveTerminal();
  }, []);

  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authData.username || !authData.password) {
      toast.error("Username aur password dono chahiye");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/login`, authData, {
        headers: { accept: "application/json" },
      });
      const { token, user } = res.data;

      if (!["admin", "manager"].includes(user.role)) {
        toast.error("Only admin/manager can setup this device.");
        setAuthLoading(false);
        return;
      }

      const endpoint =
        user.role === "admin" ? "/api/branches" : "/api/manager/branches";

      const branchRes = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = branchRes.data?.data || branchRes.data?.branches || [];
      setBranches(list);
      setTempSession({ token, role: user.role, storeId: user.store_id });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Verification failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConfirmBranch = async () => {
    if (!selectedBranch) {
      toast.error("Branch select karo");
      return;
    }
    try {
      const res = await axios.post(
        `${BASE_URL}/api/pos-terminals`,
        {
          branch_id: selectedBranch,
          device_label: navigator.userAgent?.slice(0, 80),
        },
        { headers: { Authorization: `Bearer ${tempSession.token}` } },
      );
      const { device_token, branch_id, branch_name } = res.data;

      localStorage.setItem(TOKEN_KEY, device_token);
      setCookie(TOKEN_KEY, device_token, 3650);

      setTempSession(null);
      setAuthData({ username: "", password: "" });
      setTerminal({ device_token, branch_id, branch_name });
      setSetupMode(false);
      toast.success(`Device set to "${branch_name}" branch`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not register device");
    }
  };

  const handleChangeBranch = () => {
    localStorage.removeItem(TOKEN_KEY);
    deleteCookie(TOKEN_KEY);
    setTerminal(null);
    setSetupMode(true);
    setBranches([]);
    setTempSession(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    if (!validate()) return;

    try {
      const response = await axios.post(
        `${BASE_URL}/api/login`,
        { pin: formData.pin, device_token: terminal.device_token },
        { headers: { accept: "application/json" } },
      );

      const user_detail = response.data;
      localStorage.setItem("user_detail", JSON.stringify(user_detail));
      toast.success(user_detail.message || "Login successful!");
      history.push("/pos");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
    }
  };

  if (resolving) {
    return (
      <div className="wrap-login-page">
        <div className="flex-grow flex flex-column justify-center gap30">
          <div className="login-box">
            <p className="body-text text-center">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (setupMode) {
    return (
      <div className="wrap-login-page">
        <div className="flex-grow flex flex-column justify-center gap30">
          <div className="login-box">
            <h3>Setup This Device</h3>
            <p className="body-text mb-10">
              This device is being set up for cashier login for the first time.
              Please have any admin or manager enter their username and password
              to confirm the branch - once verified, this device will remember
              the branch.
            </p>

            {!tempSession ? (
              <form
                className="form-login flex flex-column gap24"
                onSubmit={handleAuthSubmit}
              >
                <fieldset>
                  <div className="body-title mb-10">Username</div>
                  <input
                    type="text"
                    name="username"
                    value={authData.username}
                    onChange={handleAuthChange}
                  />
                </fieldset>
                <fieldset>
                  <div className="body-title mb-10">Password</div>
                  <input
                    type="password"
                    name="password"
                    value={authData.password}
                    onChange={handleAuthChange}
                  />
                </fieldset>
                <button
                  type="submit"
                  className="tf-button w-full text-white"
                  disabled={authLoading}
                >
                  {authLoading ? "Verifying..." : "Verify"}
                </button>
              </form>
            ) : (
              <div className="flex flex-column gap24">
                <fieldset>
                  <div className="body-title mb-10">Select Branch</div>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </fieldset>
                <button
                  type="button"
                  className="tf-button w-full text-white"
                  onClick={handleConfirmBranch}
                >
                  Confirm & Save
                </button>
              </div>
            )}

            <div className="body-text text-center mt-3">
              <Link to="/login" className="body-text tf-color">
                Manager Login Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap-login-page">
      <div className="flex-grow flex flex-column justify-center gap30">
        <div className="login-box">
          <h3>Cashier Login Account</h3>
          <p className="body-text mb-10">
            Branch: <strong>{terminal?.branch_name}</strong>{" "}
            <span
              className="tf-color"
              style={{ cursor: "pointer" }}
              onClick={handleChangeBranch}
            >
              (Change)
            </span>
          </p>
          <form
            className="form-login flex flex-column gap24"
            onSubmit={handleSubmit}
          >
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
