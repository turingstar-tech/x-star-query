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
 * 创建 API
 *
 * @param config API 配置
 * @returns API
 */
const createApi: CreateApi = (config) => {
  /**
   * Axios 实例
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
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const transformResponse =
      definition.transformResponse ??
      config.transformResponse ??
      ((data) => data);

    switch (definition.type) {
      case 'query': {
        const useEndpoint: QueryEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const errorHandler = config.useErrorHandler?.(
            definition.errorHandlerParams,
          );

          return useRequest(
            async () => {
              const axiosConfig =
                typeof definition.query === 'string'
                  ? { url: definition.query, params: request }
                  : definition.query(request);
              const { data } = await instance.request(axiosConfig);
              return transformResponse(data);
            },
            { ...options, onError: errorHandler },
          );
        };

        return { ...api, [`use${capitalizedName}Query`]: useEndpoint };
      }

      case 'tableQuery': {
        const useEndpoint: TableQueryEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const errorHandler = config.useErrorHandler?.(
            definition.errorHandlerParams,
          );

          return useAntdTable(
            async (params) => {
              const axiosConfig =
                typeof definition.query === 'string'
                  ? { url: definition.query, params: { ...request, ...params } }
                  : definition.query(request, params);
              const { data } = await instance.request(axiosConfig);
              return transformResponse(data);
            },
            { ...options, onError: errorHandler },
          );
        };
        return { ...api, [`use${capitalizedName}TableQuery`]: useEndpoint };
      }

      case 'paginationQuery': {
        const useEndpoint: PaginationQueryEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const errorHandler = config.useErrorHandler?.(
            definition.errorHandlerParams,
          );

          return usePagination(
            async (params) => {
              const axiosConfig =
                typeof definition.query === 'string'
                  ? { url: definition.query, params: { ...request, ...params } }
                  : definition.query(request, params);
              const { data } = await instance.request(axiosConfig);
              return transformResponse(data);
            },
            { ...options, onError: errorHandler },
          );
        };
        return {
          ...api,
          [`use${capitalizedName}PaginationQuery`]: useEndpoint,
        };
      }

      case 'mutate': {
        const useEndpoint: MutateEndpoint<typeof definition> = (
          request,
          options,
        ) => {
          const errorHandler = config.useErrorHandler?.(
            definition.errorHandlerParams,
          );

          return useRequest(
            async (params) => {
              const axiosConfig =
                typeof definition.query === 'string'
                  ? {
                      url: definition.query,
                      method: 'POST',
                      data: { ...request, ...params },
                    }
                  : definition.query(request, params);
              const { data } = await instance.request(axiosConfig);
              return transformResponse(data);
            },
            { manual: true, ...options, onError: errorHandler },
          );
        };
        return {
          ...api,
          [`use${capitalizedName}Mutate`]: useEndpoint,
        };
      }

      default: {
        const _: never = definition;
        return _;
      }
    }
  }, {});
};

export default createApi;
