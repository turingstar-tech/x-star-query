# createApi

`createApi` 创建一组请求 Hooks。

## 代码演示

```tsx
/**
 * title: 基本使用
 */

import { useInterval } from 'ahooks';
import { useState } from 'react';
import { createApi } from 'x-star-query';

/**
 * 错误处理函数
 */
const useErrorHandler = (params?: { path: string }) => {
  return (error: any) => console.log(params?.path, error);
};

const { useListTopContestsQuery, useGetContestNameQuery } = createApi({
  /**
   * 全局 Axios 配置
   */
  axiosConfig: { baseURL: 'https://api.contest.xinyoudui.com/v1' },

  /**
   * 全局响应转换
   */
  transformResponse: (data) => {
    if (data.code !== 200) {
      throw new Error(data.code + ': ' + data.msg);
    }
    return data.data;
  },

  endpoints: (builder) => ({
    listTopContests: builder.query<{ total: number; list: any[] }>({
      query: '/contest/top/list',
    }),

    getContestName: builder.query<string, { id: number }>({
      /**
       * 请求 Axios 配置
       */
      query: (request) => ({ url: '/contest/detail', params: request }),

      /**
       * 请求错误处理函数参数
       */
      errorHandlerParams: { path: '/contest/detail' },

      options: {
        /**
         * 请求响应转换（会覆盖全局）
         */
        transformResponse: (data) => {
          if (data.code !== 200) {
            throw new Error(data.code + ': ' + data.msg);
          }
          return data.data.nameZh;
        },
      },
    }),
  }),

  useErrorHandler,
});

export default () => {
  const { loading, data, refreshAsync } = useListTopContestsQuery(undefined, {
    pollingInterval: 5000,
  });

  const [id, setId] = useState(1);

  const { data: name, error } = useGetContestNameQuery(
    { id },
    { refreshDeps: [id] },
  );

  useInterval(() => {
    if (id < 10) {
      setId(id + 1);
    }
  }, 1000);

  return (
    <>
      <button onClick={refreshAsync}>重新获取</button>
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {loading ? '加载中' : JSON.stringify(data)}
      </div>
      <hr />
      <button onClick={() => setId(1)}>重置</button>
      <div>{id}</div>
      <div style={{ color: error ? 'red' : 'blue' }}>
        {error ? error.message : name}
      </div>
    </>
  );
};
```

## API

### createApi

```ts
interface CreateApi {
  <Definitions extends EndpointDefinitions>(
    config: ApiConfig<Definitions> & { axiosConfig?: AxiosRequestConfig },
  ): ApiHooks<Definitions>;
}
```

`Hooks` 根据 `config.endpoints` 里的字段名和请求类型生成。例如，`config.endpoints` 里有一个 `getUser` 字段，是一个查询请求，则 `Hooks` 里会有一个 `useGetUserQuery` 字段，是一个请求 Hook。请求 Hook 的类型为 `(request: Request, options?: Options) => Result`。

### ApiConfig

| 属性名            | 类型                                                  | 描述             |
| ----------------- | ----------------------------------------------------- | ---------------- |
| transformResponse | `TransformResponse<any, any, any>`                    | 全局响应转换函数 |
| endpoints         | `(builder: EndpointDefinitionBuilder) => Definitions` | 请求定义         |
| useErrorHandler   | `(params?: any) => (error: any) => void`              | 错误处理 Hook    |

### TransformResponse

响应转换函数将 Axios 请求返回的数据进行转换。

```ts
interface TransformResponse<Response, Request, Params> {
  (data: any, request: Request, params: Params): Response | Promise<Response>;
}
```

### EndpointDefinitionBuilder

接口定义生成器包含一组用于生成接口定义的函数。

| 属性名          | 返回值                                                         | 描述         |
| --------------- | -------------------------------------------------------------- | ------------ |
| query           | `QueryEndpointDefinition<Response, Request, Params>`           | 查询请求     |
| tableQuery      | `TableQueryEndpointDefinition<Response, Request, Params>`      | 表格查询请求 |
| paginationQuery | `PaginationQueryEndpointDefinition<Response, Request, Params>` | 分页查询请求 |
| mutate          | `MutateEndpointDefinition<Response, Request, Params>`          | 修改请求     |

### BaseEndpointDefinition

| 属性名             | 类型                                                                                               | 描述             |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------- |
| query              | `string \| AxiosRequestConfig \| ((request: Request, params: Params) => AxiosRequestConfig)`       | Axios 请求配置   |
| errorHandlerParams | `any`                                                                                              | 错误处理函数参数 |
| options            | `Options<Response, Request, Params> \| ((request: Request) => Options<Response, Request, Params>)` | 请求选项         |
