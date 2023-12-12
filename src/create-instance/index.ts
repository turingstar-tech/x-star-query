import axios from 'axios';
import baseCreateApi from '../base-create-api';
import { CreateInstance } from '../types';

/**
 * 实例创建函数
 *
 * @param axiosConfig Axios 配置
 * @returns 实例
 */
const createInstance: CreateInstance = (axiosConfig) => {
  /**
   * Axios 实例
   */
  const instance = axios.create(axiosConfig);

  return {
    instance,
    createApi: (config) => baseCreateApi(instance, config),
  };
};

export default createInstance;
