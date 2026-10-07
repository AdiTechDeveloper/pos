import React, { useEffect, useState } from "react";
import Layout from "./layout";
import {
  getAiInsights,
  refreshAiInsights,
  getAiInsightBranches,
} from "../utils/api";
import { toast } from "react-toastify";

const parseInsight = (insight) => {
  if (!insight?.ai_message) return null;
  try {
    const parsed = JSON.parse(insight.ai_message);
    return {
      status_summary: parsed.status_summary || "",
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (e) {
    // fallback for old plain-text rows generated before JSON format existed
    return {
      status_summary: insight.ai_message,
      highlights: [],
      suggestions: [],
    };
  }
};

function InsightCard({ title, insight }) {
  const parsed = parseInsight(insight);

  return (
    <div className="relative bg-white rounded-2xl shadow-md border border-indigo-100 p-5 overflow-hidden mt-8">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-3xl font-bold text-gray-800">{title}</h3>
        <span className="flex items-center gap-1 text-xl font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          ✨ AI Generated
        </span>
      </div>

      {!parsed ? (
        <p className="text-sm text-gray-400">No insight generated yet.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-2xl text-gray-700 leading-relaxed">
            {parsed.status_summary}
          </p>

          {parsed.highlights.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-3">
              <p className="text-2xl font-bold text-amber-700 mb-1">
                ⚠ KEY POINTS
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {parsed.highlights.map((h, i) => (
                  <li key={i} className="text-2xl text-amber-800">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.suggestions.length > 0 && (
            <div className="bg-emerald-50 border-l-4 border-emerald-400 rounded-lg p-3">
              <p className="text-2xl font-bold text-emerald-700 mb-1 mt-2">
                💡 SUGGESTIONS TO GROW SALES
              </p>
              <ul className="list-disc list-inside space-y-1 mt-4">
                {parsed.suggestions.map((s, i) => (
                  <li key={i} className="text-2xl text-emerald-800">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AiInsights() {
  const user_data = JSON.parse(localStorage.getItem("user_detail"));
  const token = user_data?.token;

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [data, setData] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBranches = async () => {
    try {
      const res = await getAiInsightBranches(token);
      const list = res.data.branches || [];
      setBranches(list);
      if (list.length > 0) setSelectedBranch(list[0].id);
    } catch (err) {
      toast.error("Could not load branches.");
    }
  };

  const loadInsight = async (branchId) => {
    setLoading(true);
    try {
      const res = await getAiInsights(token, branchId);
      setData(res.data);
      setRemaining(res.data.remaining_today);
    } catch (err) {
      toast.error("Could not load AI insight.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch !== null) {
      loadInsight(selectedBranch);
    }
  }, [selectedBranch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshAiInsights(token, selectedBranch);
      setData(res.data);
      setRemaining(res.data.remaining_today);
      toast.success("AI insight updated!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Refresh failed. Please try again.";
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="main-content-inner">
        <div className="main-content-wrap">
          <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-4xl font-bold flex items-center gap-2">
                🤖 Know Your Bussiness
              </h2>
              <p className="text-2xl text-gray-500 mt-8">
                Automatically generated analysis of your sales and purchase
                data.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="border rounded-lg px-3 py-2"
                value={selectedBranch ?? ""}
                onChange={(e) => setSelectedBranch(Number(e.target.value))}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRefresh}
                disabled={refreshing || remaining === 0}
                className="m-3 inline-flex items-center justify-center gap-2.5 px-16 py-3 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 active:scale-95 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 whitespace-nowrap transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:shadow-none cursor-pointer"
              >
                {refreshing ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Generating Report</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl leading-none">✨</span>
                    <span className="text-2xl">Generate Insights</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {remaining !== null && (
            <p className="text-2xl text-gray-500 mb-4">
              Reports remaining today for this branch:{" "}
              <strong>{remaining} / 2</strong>
            </p>
          )}

          {loading ? (
            <div className="p-6">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InsightCard title="Today's Insight" insight={data?.daily} />
              <InsightCard
                title="This Month's Insight"
                insight={data?.monthly}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
