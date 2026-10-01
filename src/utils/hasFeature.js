export const hasFeature = (featureKey) => {
  try {
    const user_detail = localStorage.getItem("user_detail");
    const user_data = user_detail ? JSON.parse(user_detail) : null;

    const features = user_data?.user?.features || user_data?.features || [];

    return Array.isArray(features) && features.includes(featureKey);
  } catch (err) {
    console.error("hasFeature check failed:", err);
    return false;
  }
};