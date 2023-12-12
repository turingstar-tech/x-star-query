# createInstance

`createInstance` 创建一个请求实例，返回的 `createApi` 方法创建的请求共享同一个 Axios 实例。

## 代码演示

```tsx
/**
 * title: 基本使用
 */

import { useInterval } from 'ahooks';
import { useState } from 'react';
import { createInstance } from 'x-star-query';

const { instance, createApi } = createInstance({
  baseURL: 'https://api.contest.xinyoudui.com/v1',
});

instance.interceptors.request.use((request) => {
  request.headers.setAuthorization('test');
  return request;
});

/**
 * 错误处理函数
 */
const useErrorHandler = (params?: { path: string }) => {
  return (error: any) => console.log(params?.path, error);
};

const { useListTopContestsQuery } = createApi({
  endpoints: (builder) => ({
    listTopContests: builder.query<{ total: number; list: any[] }>({
      query: '/contest/top/list',
    }),
  }),
});

const { useGetContestNameQuery } = createApi({
  endpoints: (builder) => ({
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

### createInstance

```ts
interface CreateInstance {
  (axiosConfig?: AxiosRequestConfig): {
    instance: AxiosInstance;
    createApi: <Definitions extends EndpointDefinitions>(
      config: ApiConfig<Definitions>,
    ) => ApiHooks<Definitions>;
  };
}
```
