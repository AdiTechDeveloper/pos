export const hasFeature = (featureKey) => {
  try {
    const user_detail = localStorage.getItem("user_detail");
    const user_data = user_detail ? JSON.parse(user_detail) : null;

    // Adjust this path to match wherever your backend actually
    // stores the enabled-features list on the logged-in user/store.
    const features = user_data?.user?.features || user_data?.features || [];

    return Array.isArray(features) && features.includes(featureKey);
  } catch (err) {
    console.error("hasFeature check failed:", err);
    return false;
  }
};