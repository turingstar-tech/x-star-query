import { useRequest } from 'ahooks';
import axios from 'axios';
import type { CreateApi, QueryEndpoint } from './define';

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
    mutate: (definition) => ({ ...definition, type: 'mutate' }),
  });

  return Object.entries(endpoints).reduce<any>((api, [name, definition]) => {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

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
              const query =
                typeof definition.query === 'function'
                  ? definition.query(request)
                  : definition.query;
              const config = typeof query === 'string' ? { url: query } : query;
              const response = await instance.request(config);
              return definition.transformResponse
                ? definition.transformResponse(response)
                : response;
            },
            { ...options, onError: errorHandler },
          );
        };

        return { ...api, [`use${capitalizedName}Query`]: useEndpoint };
      }

      case 'tableQuery': {
        return { ...api };
      }

      case 'mutate': {
        return { ...api };
      }

      default: {
        const _: never = definition;
        return _;
      }
    }
  }, {});
};

export default createApi;
