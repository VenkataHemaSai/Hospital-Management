import api from "./axios.js";

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
};

export const userAPI = {
  getDoctors: (params) => api.get("/users/doctors", { params }),
  getDoctorById: (id) => api.get(`/users/doctors/${id}`),
  getMyProfile: () => api.get("/users/profile"),
  updateMyProfile: (data) => api.put("/users/profile", data),
  getPatients: (params) => api.get("/users/patients", { params }),
  getPatientById: (id) => api.get(`/users/patients/${id}`),
};

export const appointmentAPI = {
  create: (data) => api.post("/appointments", data),
  getAll: (params) => api.get("/appointments", { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),
  getAvailableSlots: (doctorId, date) =>
    api.get(`/appointments/doctor/${doctorId}/available-slots`, {
      params: { date },
    }),
};

export const prescriptionAPI = {
  create: (data) => api.post("/prescriptions", data),
  getAll: (params) => api.get("/prescriptions", { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  updateStatus: (id, data) => api.put(`/prescriptions/${id}/status`, data),
};

export const recordAPI = {
  upload: (formData) =>
    api.post("/records", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getAll: (params) => api.get("/records", { params }),
  getById: (id) => api.get(`/records/${id}`),
  delete: (id) => api.delete(`/records/${id}`),
};

export const chatAPI = {
  getConversations: () => api.get("/chat/conversations"),
  createOrGet: (participantId) =>
    api.post("/chat/conversations", { participantId }),
  getMessages: (conversationId, params) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, data) =>
    api.post(`/chat/conversations/${conversationId}/messages`, data),
};
