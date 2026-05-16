import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message || err.message || 'Server error';
    return Promise.reject(new Error(msg));
  }
);

// ── BLOG ──────────────────────────────────────────────────────────────────
export const blogApi = {
  getStats: () => api.get('/blog/stats'),
  getUsers: (params) => api.get('/blog/users', { params }),
  createUser: (data) => api.post('/blog/users', data),
  updateUser: (id, data) => api.put(`/blog/users/${id}`, data),
  deleteUser: (id) => api.delete(`/blog/users/${id}`),

  getPosts: (params) => api.get('/blog/posts', { params }),
  getPostById: (id) => api.get(`/blog/posts/${id}`),
  createPost: (data) => api.post('/blog/posts', data),
  updatePost: (id, data) => api.put(`/blog/posts/${id}`, data),
  deletePost: (id) => api.delete(`/blog/posts/${id}`),

  getComments: (params) => api.get('/blog/comments', { params }),
  approveComment: (id) => api.put(`/blog/comments/${id}/approve`),
  deleteComment: (id) => api.delete(`/blog/comments/${id}`),

  getCategories: () => api.get('/blog/categories'),
  createCategory: (data) => api.post('/blog/categories', data),
  updateCategory: (id, data) => api.put(`/blog/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/blog/categories/${id}`),

  getTags: () => api.get('/blog/tags'),
  createTag: (data) => api.post('/blog/tags', data),
  deleteTag: (id) => api.delete(`/blog/tags/${id}`),
};

// ── MOVIES ────────────────────────────────────────────────────────────────
export const moviesApi = {
  getStats: () => api.get('/movies/stats'),
  getGenres: () => api.get('/movies/genres'),

  getMovies: (params) => api.get('/movies/', { params }),
  getMovieById: (id) => api.get(`/movies/${id}`),
  createMovie: (data) => api.post('/movies/', data),
  updateMovie: (id, data) => api.put(`/movies/${id}`, data),
  deleteMovie: (id) => api.delete(`/movies/${id}`),

  getCustomers: (params) => api.get('/movies/customers', { params }),
  createCustomer: (data) => api.post('/movies/customers', data),
  updateCustomer: (id, data) => api.put(`/movies/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/movies/customers/${id}`),

  getActiveRentals: (params) => api.get('/movies/rentals/active', { params }),
  rentMovie: (data) => api.post('/movies/rent', data),
  returnMovie: (id) => api.post(`/movies/return/${id}`),

  getTransactions: (params) => api.get('/movies/transactions', { params }),
  addToQueue: (data) => api.post('/movies/queue', data),
};

// ── GRADEBOOK ─────────────────────────────────────────────────────────────
export const gradebookApi = {
  getStats: () => api.get('/gradebook/stats'),
  getDepartments: () => api.get('/gradebook/departments'),
  getInstructors: () => api.get('/gradebook/instructors'),

  getStudents: (params) => api.get('/gradebook/students', { params }),
  getStudentById: (id) => api.get(`/gradebook/students/${id}`),
  createStudent: (data) => api.post('/gradebook/students', data),
  updateStudent: (id, data) => api.put(`/gradebook/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/gradebook/students/${id}`),

  getCourses: (params) => api.get('/gradebook/courses', { params }),
  createCourse: (data) => api.post('/gradebook/courses', data),
  updateCourse: (id, data) => api.put(`/gradebook/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/gradebook/courses/${id}`),

  enrollStudent: (data) => api.post('/gradebook/enrollments', data),
  unenrollStudent: (id) => api.delete(`/gradebook/enrollments/${id}`),

  getGrades: (params) => api.get('/gradebook/grades', { params }),
  submitGrade: (data) => api.post('/gradebook/grades', data),
  deleteGrade: (id) => api.delete(`/gradebook/grades/${id}`),

  getAssignments: (params) => api.get('/gradebook/assignments', { params }),
  createAssignment: (data) => api.post('/gradebook/assignments', data),
  deleteAssignment: (id) => api.delete(`/gradebook/assignments/${id}`),

  getMessages: (params) => api.get('/gradebook/messages', { params }),
  sendMessage: (data) => api.post('/gradebook/messages', data),
  markMessageRead: (id) => api.put(`/gradebook/messages/${id}/read`),
};

export default api;
