// This is a demo request code for how to use auto generated service class.
// You can also use your own request instance like axios or fetch.

import axios, { type AxiosRequestConfig } from 'axios'; // Install axios if you haven't
import TongjiStudentService from './TongjiStudent/index';

const BASE_URL = 'http://localhost:3000'; // Change to the actual base URL

export const demoServiceForAxios = new TongjiStudentService<AxiosRequestConfig>(
  {
    baseURL: BASE_URL,
    request: (config, _options) =>
      axios.request({ ...config }).then((res) => res.data),
  },
);

export const demoServiceForFetch = new TongjiStudentService<RequestInit>({
  baseURL: BASE_URL,
  request: (config, _options) =>
    fetch(config.url, { ...config }).then((res) => res.json()),
});
