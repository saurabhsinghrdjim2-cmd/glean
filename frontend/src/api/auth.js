import client from "./client";

export const registerUser = (email, password) =>
  client.post("/auth/register", { email, password });

export const loginUser = (email, password) => {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);
  return client.post("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

export const getMe = () => client.get("/auth/me");