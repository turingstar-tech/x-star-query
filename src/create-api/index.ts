import axios from 'axios';
import baseCreateApi from '../base-create-api';
import type { CreateApi } from '../types';

/**
 * API 创建函数
 *
 * @param config API 配置
 * @returns API
 */
const createApi: CreateApi = (config) => {
  /**
   * Axios 实例
   */
  const instance = axios.create(config.axiosConfig);

  return baseCreateApi(instance, config);
};

export default createApi;
