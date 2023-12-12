import { describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-hooks';
import type { AxiosRequestConfig } from 'axios';
import createInstance from '../src/create-instance';

jest.useFakeTimers();

// 模拟 Axios 实例
jest.mock('axios', () => ({
  create: () => {
    // 模拟服务器数据
    let store: Record<string, string> = { hello: 'world!', good: 'night.' };

    return {
      // 模拟请求方法
      request: async ({ url, method = 'GET' }: AxiosRequestConfig) => {
        // 模拟服务器延迟
        await new Promise((resolve) => {
          setTimeout(resolve, 500);
        });

        // 模拟路由
        switch (url) {
          case '/store': {
            if (method === 'GET') {
              return { data: store };
            }
            return { data: undefined };
          }

          default: {
            return { data: undefined };
          }
        }
      },
    };
  },
}));

describe('query endpoint', () => {
  test('simple query', async () => {
    const { createApi } = createInstance();
    const { useGetStoreQuery } = createApi({
      endpoints: (builder) => ({
        getStore: builder.query<object>({ query: '/store' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() => useGetStoreQuery());

    // 初始无数据，正在加载
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有数据，加载完成
    expect(result.current.data).toEqual({ hello: 'world!', good: 'night.' });
    expect(result.current.loading).toBe(false);
  });
});
