import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/sofia/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Interceptor for handling token refresh or unauthorized errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(function (resolve, reject) {
        axios
          .post('/sofia/api/auth/refreshtoken', {}, { withCredentials: true })
          .then(() => {
            processQueue(null);
            resolve(apiClient(originalRequest));
          })
          .catch((refreshError) => {
            processQueue(refreshError);
            // Redirect to login if refresh fails
            if (!window.location.pathname.endsWith('/login')) {
              window.location.href = import.meta.env.BASE_URL + 'login';
            }
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }
    return Promise.reject(error);
  }
);

export { apiClient };
