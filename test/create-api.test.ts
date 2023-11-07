import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-hooks';
import type { AxiosRequestConfig } from 'axios';
import { createApi } from '../src';

// 模拟 axios 实例
jest.mock('axios', () => ({
  create: () => {
    // 模拟服务器数据
    let store = { hello: 'world!', good: 'night.' };

    return {
      // 模拟请求方法
      request: ({ url, params, method = 'GET', data }: AxiosRequestConfig) => {
        // 模拟路由
        switch (url) {
          case '/store': {
            if (method === 'GET') {
              return { data: store };
            } else if (method === 'POST') {
              store = data;
              return { data: undefined };
            }
            return { data: undefined };
          }

          case '/store/key': {
            if (method === 'GET') {
              return { data: store[params.key] };
            } else if (method === 'POST') {
              store[data.key] = data.value;
              return { data: undefined };
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
    const { useGetStoreQuery } = createApi({
      endpoints: (builder) => ({
        getStore: builder.query<object>({ query: '/store' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() => useGetStoreQuery());

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toEqual({ hello: 'world!', good: 'night.' });
    expect(result.current.loading).toBe(false);
  });

  test('query with params', async () => {
    const { useGetStoreKeyQuery } = createApi({
      endpoints: (builder) => ({
        getStoreKey: builder.query<object, { key: string }>({
          query: ({ key }) => ({ url: '/store/key', params: { key } }),
          options: ({ key }) => ({
            refreshDeps: [key],
          }),
        }),
      }),
    });

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ key }) => useGetStoreKeyQuery({ key }),
      { initialProps: { key: 'hello' } },
    );

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(false);

    rerender({ key: 'good' });

    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.data).toBe('night.');
    expect(result.current.loading).toBe(false);
  });

  test('query error', async () => {
    const transformResponse = jest.fn((data) => {
      if (data === undefined) {
        throw new Error('not found');
      }
      return data;
    });
    const errorHandler = jest.fn();

    const { useThrowErrorQuery } = createApi({
      transformResponse,
      endpoints: (builder) => ({
        throwError: builder.query<object>({ query: '/error' }),
      }),
      useErrorHandler: () => errorHandler,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useThrowErrorQuery(),
    );

    expect(transformResponse).toBeCalledTimes(0);
    expect(errorHandler).toBeCalledTimes(0);
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(transformResponse).toBeCalledTimes(1);
    expect(transformResponse.mock.calls[0][0]).toBe(undefined);
    expect(errorHandler).toBeCalledTimes(1);
    expect(errorHandler.mock.calls[0][0]).toEqual(new Error('not found'));
    expect(result.current.error).toEqual(new Error('not found'));
    expect(result.current.loading).toBe(false);
  });
});

describe('mutate endpoint', () => {
  test('simple mutate', async () => {
    const { useGetStoreQuery, useUpdateStoreMutate } = createApi({
      endpoints: (builder) => ({
        getStore: builder.query<object>({ query: '/store' }),
        updateStore: builder.mutate<object, void, object>({ query: '/store' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() => ({
      get: useGetStoreQuery(),
      update: useUpdateStoreMutate(),
    }));

    expect(result.current.update.loading).toBe(false);

    await waitForNextUpdate();

    expect(result.current.get.data).toEqual({
      hello: 'world!',
      good: 'night.',
    });

    act(() => {
      result.current.update.runAsync({ what: 'for?' });
    });

    expect(result.current.update.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.update.loading).toBe(false);

    act(() => {
      result.current.get.runAsync();
    });

    await waitForNextUpdate();

    expect(result.current.get.data).toEqual({ what: 'for?' });
  });
});
