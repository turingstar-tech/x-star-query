import { useAntdTable, usePagination, useRequest } from 'ahooks';
import axios from 'axios';
import type {
  CreateApi,
  MutateEndpoint,
  PaginationQueryEndpoint,
  QueryEndpoint,
  TableQueryEndpoint,
} from './define';

/**
 * 将字符串首字母大写
 *
 * @param str 字符串
 * @returns 首字母大写后的字符串
 */
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * 创建 API
 *
 * @param config API 配置
 * @returns API
 */
const createApi: CreateApi = (config) => {
  /**
   * axios 实例
   */
  const instance = axios.create(config.axiosConfig);

  /**
   * 接口定义映射
   */
  const endpoints = config.endpoints({
    query: (definition) => ({ ...definition, type: 'query' }),
    tableQuery: (definition) => ({ ...definition, type: 'tableQuery' }),
    paginationQuery: (definition) => ({
      ...definition,
      type: 'paginationQuery',
    }),
    mutate: (definition) => ({ ...definition, type: 'mutate' }),
  });

  return Object.entries(endpoints).reduce<any>((api, [name, definition]) => {
    const hookName = `use${capitalize(name)}${capitalize(definition.type)}`;

    switch (definition.type) {
      case 'query': {
        const useEndpoint: QueryEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const finalOptions = {
            ...(typeof definition.options === 'function'
              ? definition.options(request)
              : definition.options),
            ...options,
            onError: config.useErrorHandler?.(definition.errorHandlerParams),
          };

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          return useRequest(async (...[params]) => {
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, params)
                : typeof definition.query === 'object'
                ? definition.query
                : { url: definition.query, params: { ...request, ...params } };
            const { data } = await instance.request(axiosConfig);
            return transformResponse(data, request, params);
          }, finalOptions);
        };

        return { ...api, [hookName]: useEndpoint };
      }

      case 'tableQuery': {
        const useEndpoint: TableQueryEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const finalOptions = {
            ...(typeof definition.options === 'function'
              ? definition.options(request)
              : definition.options),
            ...options,
            onError: config.useErrorHandler?.(definition.errorHandlerParams),
          };

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          return useAntdTable(async (...[paginationData, formData]) => {
            const params = { ...paginationData, ...formData };
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, params)
                : typeof definition.query === 'object'
                ? definition.query
                : { url: definition.query, params: { ...request, ...params } };
            const { data } = await instance.request(axiosConfig);
            return transformResponse(data, request, params);
          }, finalOptions);
        };

        return { ...api, [hookName]: useEndpoint };
      }

      case 'paginationQuery': {
        const useEndpoint: PaginationQueryEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const finalOptions = {
            ...(typeof definition.options === 'function'
              ? definition.options(request)
              : definition.options),
            ...options,
            onError: config.useErrorHandler?.(definition.errorHandlerParams),
          };

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          return usePagination(async (...[paginationData, formData]) => {
            const params = { ...paginationData, ...formData };
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, params)
                : typeof definition.query === 'object'
                ? definition.query
                : { url: definition.query, params: { ...request, ...params } };
            const { data } = await instance.request(axiosConfig);
            return transformResponse(data, request, params);
          }, finalOptions);
        };

        return { ...api, [hookName]: useEndpoint };
      }

      case 'mutate': {
        const useEndpoint: MutateEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const finalOptions = {
            ...(typeof definition.options === 'function'
              ? definition.options(request)
              : definition.options),
            ...options,
            manual: true,
            onError: config.useErrorHandler?.(definition.errorHandlerParams),
          };

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          const result = useRequest(async (...[params]) => {
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, params)
                : typeof definition.query === 'object'
                ? definition.query
                : {
                    url: definition.query,
                    method: 'POST',
                    data: { ...request, ...params },
                  };
            const { data } = await instance.request(axiosConfig);
            return transformResponse(data, request, params);
          }, finalOptions);

          return {
            ...result,
            runAsync: async (params) => {
              let oldData: any;
              finalOptions.autoMutate?.((data) => ((oldData = data), params));
              try {
                return await result.runAsync(params);
              } catch (error) {
                finalOptions.autoMutate?.((data) =>
                  data === params ? oldData : data,
                );
                throw error;
              } finally {
                finalOptions.autoRefresh?.();
              }
            },
          };
        };

        return { ...api, [hookName]: useEndpoint };
      }

      default: {
        return api;
      }
    }
  }, {});
};

export default createApi;
