export const hasFeature = (key) => {
  const stored = localStorage.getItem("user_detail");
  const user = stored ? JSON.parse(stored).user : null;
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return user.features?.includes(key) ?? false;
};

export const getFeatures = () => {
  const stored = localStorage.getItem("user_detail");
  const user = stored ? JSON.parse(stored).user : null;
  return user?.features || [];
};
