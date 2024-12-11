import { useAntdTable, usePagination, useRequest } from 'ahooks';
import type { CancelTokenSource } from 'axios';
import axios from 'axios';
import { useRef } from 'react';
import type {
  BaseCreateApi,
  MutateEndpoint,
  PaginationQueryEndpoint,
  QueryEndpoint,
  TableQueryEndpoint,
} from '../types';

/**
 * 将字符串首字母大写
 *
 * @param str 字符串
 * @returns 首字母大写后的字符串
 */
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * 基础 API 创建函数
 *
 * @param instance Axios 实例
 * @param config API 配置
 * @returns API
 */
const baseCreateApi: BaseCreateApi = (instance, config) => {
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

    const useErrorHandler = (options: {
      onError?: (error: Error, params: any) => void;
    }) => {
      const errorHandler = config.useErrorHandler?.(
        definition.errorHandlerParams,
      );
      if (errorHandler) {
        const { onError } = options;
        options.onError = (error, params) => {
          onError?.(error, params);
          errorHandler(error);
        };
      }
    };

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
          };

          useErrorHandler(finalOptions);

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          const cancelTokenRef = useRef<CancelTokenSource>();

          return useRequest(async (...[params]) => {
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, params)
                : typeof definition.query === 'object'
                ? definition.query
                : { url: definition.query, params: { ...request, ...params } };
            cancelTokenRef.current?.cancel();
            cancelTokenRef.current = axios.CancelToken.source();
            const { data } = await instance.request({
              ...axiosConfig,
              cancelToken: cancelTokenRef.current.token,
            });
            return transformResponse(data);
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
          };

          if (finalOptions.paramsSyncLocation) {
            // 从 URL 获取初始分页和搜索参数
            const searchParams = new URLSearchParams(location.search);
            const pagination = finalOptions.defaultParams?.[0];
            const current =
              +(searchParams.get('current') ?? '') || pagination?.current || 1;
            const pageSize =
              +(searchParams.get('pageSize') ?? '') ||
              finalOptions.defaultPageSize ||
              pagination?.pageSize ||
              10;
            let params = finalOptions.defaultParams?.[1];
            try {
              params = JSON.parse(searchParams.get('params') ?? '');
            } catch {}
            finalOptions.defaultParams = [
              { ...pagination, current, pageSize },
              params,
            ];
            finalOptions.defaultPageSize = pageSize;
          }

          useErrorHandler(finalOptions);

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          const cancelTokenRef = useRef<CancelTokenSource>();

          return useAntdTable(async (...[pagination, params]) => {
            if (finalOptions.paramsSyncLocation) {
              // 将分页和搜索参数更新到 URL
              const searchParams = new URLSearchParams(location.search);
              searchParams.set('current', `${pagination.current}`);
              searchParams.set('pageSize', `${pagination.pageSize}`);
              if (params) {
                searchParams.set('params', JSON.stringify(params));
              } else {
                searchParams.delete('params');
              }
              history.replaceState(null, '', `?${searchParams}`);
            }
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, pagination, params)
                : typeof definition.query === 'object'
                ? definition.query
                : {
                    url: definition.query,
                    params: { ...request, ...pagination, ...params },
                  };
            cancelTokenRef.current?.cancel();
            cancelTokenRef.current = axios.CancelToken.source();
            const { data } = await instance.request({
              ...axiosConfig,
              cancelToken: cancelTokenRef.current.token,
            });
            return transformResponse(data);
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
          };

          useErrorHandler(finalOptions);

          const transformResponse =
            finalOptions.transformResponse ??
            config.transformResponse ??
            ((data) => data);

          const cancelTokenRef = useRef<CancelTokenSource>();

          return usePagination(async (...[pagination, params]) => {
            const axiosConfig =
              typeof definition.query === 'function'
                ? definition.query(request, pagination, params)
                : typeof definition.query === 'object'
                ? definition.query
                : {
                    url: definition.query,
                    params: { ...request, ...pagination, ...params },
                  };
            cancelTokenRef.current?.cancel();
            cancelTokenRef.current = axios.CancelToken.source();
            const { data } = await instance.request({
              ...axiosConfig,
              cancelToken: cancelTokenRef.current.token,
            });
            return transformResponse(data);
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
          };

          useErrorHandler(finalOptions);

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
            return transformResponse(data);
          }, finalOptions);

          return {
            ...result,
            runAsync: async (params) => {
              let oldData: any;
              finalOptions.autoMutate?.((data) => ((oldData = data), params));
              try {
                const data = await result.runAsync(params);
                finalOptions.autoRefresh?.();
                return data;
              } catch (error) {
                finalOptions.autoMutate?.((data) =>
                  data === params ? oldData : data,
                );
                throw error;
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

export default baseCreateApi;
