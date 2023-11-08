import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-hooks';
import type { AxiosRequestConfig } from 'axios';
import { createApi } from '../src';

// 模拟 axios 实例
jest.mock('axios', () => ({
  create: () => {
    // 模拟服务器数据
    let store = { hello: 'world!', good: 'night.' };
    let list = Array.from({ length: 100 }).map((_, id) => ({ id }));

    return {
      // 模拟请求方法
      request: async ({
        url,
        params,
        method = 'GET',
        data,
      }: AxiosRequestConfig) => {
        // 模拟服务器延迟
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });

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

          case '/list': {
            if (method === 'GET') {
              let result = list;
              if (params.filters) {
                result = result.filter(({ id }) =>
                  params.filters.id.includes(id),
                );
              }
              if (
                params.sorter &&
                params.sorter.field === 'id' &&
                params.sorter.order === 'descend'
              ) {
                result = result.sort((a, b) => b.id - a.id);
              }
              return {
                data: {
                  total: result.length,
                  list: result.slice(
                    (params.current - 1) * params.pageSize,
                    params.current * params.pageSize,
                  ),
                },
              };
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
    const query = jest.fn(({ key }) => ({
      url: '/store/key',
      params: { key },
    }));
    const options = jest.fn(({ key }) => ({ refreshDeps: [key] }));

    const { useGetStoreKeyQuery } = createApi({
      endpoints: (builder) => ({
        getStoreKey: builder.query<object, { key: string }>({ query, options }),
      }),
    });

    const { result, rerender, waitForNextUpdate } = renderHook(
      ({ key }) => useGetStoreKeyQuery({ key }),
      { initialProps: { key: 'hello' } },
    );

    expect(query).toBeCalledTimes(1);
    expect(query.mock.calls[0][0]).toEqual({ key: 'hello' });
    expect(options).toBeCalledTimes(2);
    expect(options.mock.calls[0][0]).toEqual({ key: 'hello' });
    expect(options.mock.calls[1][0]).toEqual({ key: 'hello' });
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(query).toBeCalledTimes(1);
    expect(options).toBeCalledTimes(3);
    expect(options.mock.calls[2][0]).toEqual({ key: 'hello' });
    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(false);

    rerender({ key: 'good' });

    expect(query).toBeCalledTimes(2);
    expect(query.mock.calls[1][0]).toEqual({ key: 'good' });
    expect(options).toBeCalledTimes(5);
    expect(options.mock.calls[3][0]).toEqual({ key: 'good' });
    expect(options.mock.calls[4][0]).toEqual({ key: 'good' });
    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(query).toBeCalledTimes(2);
    expect(options).toBeCalledTimes(6);
    expect(options.mock.calls[5][0]).toEqual({ key: 'good' });
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
    const useErrorHandler = jest.fn<(params: any) => any>(() => errorHandler);

    const { useThrowErrorQuery } = createApi({
      transformResponse,
      endpoints: (builder) => ({
        throwError: builder.query<object>({
          query: { url: '/error' },
          errorHandlerParams: 'params',
        }),
      }),
      useErrorHandler,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useThrowErrorQuery(),
    );

    expect(transformResponse).toBeCalledTimes(0);
    expect(errorHandler).toBeCalledTimes(0);
    expect(useErrorHandler).toBeCalledTimes(2);
    expect(useErrorHandler.mock.calls[0][0]).toBe('params');
    expect(useErrorHandler.mock.calls[1][0]).toBe('params');
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(transformResponse).toBeCalledTimes(1);
    expect(transformResponse.mock.calls[0][0]).toBe(undefined);
    expect(errorHandler).toBeCalledTimes(1);
    expect(errorHandler.mock.calls[0][0]).toEqual(new Error('not found'));
    expect(useErrorHandler).toBeCalledTimes(3);
    expect(useErrorHandler.mock.calls[2][0]).toBe('params');
    expect(result.current.error).toEqual(new Error('not found'));
    expect(result.current.loading).toBe(false);
  });
});

describe('table query endpoint', () => {
  test('simple table query', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<
          { total: number; list: { id: number }[] },
          void,
          { current: number; pageSize: number }
        >({ query: '/list' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(),
    );

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(false);
    expect(result.current.tableProps).toMatchObject({
      dataSource: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
    });

    await waitForNextUpdate();

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);
    expect(result.current.tableProps).toMatchObject({
      dataSource: [],
      loading: true,
      pagination: { current: 1, pageSize: 10, total: 0 },
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.tableProps).toMatchObject({
      dataSource: Array.from({ length: 10 }).map((_, id) => ({ id })),
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 100 },
    });

    act(() => {
      result.current.tableProps.onChange({ current: 7, pageSize: 16 });
    });

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.tableProps).toMatchObject({
      dataSource: Array.from({ length: 10 }).map((_, id) => ({ id })),
      loading: true,
      pagination: { current: 7, pageSize: 16, total: 100 },
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 4 }).map((_, id) => ({ id: id + 96 })),
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.tableProps).toMatchObject({
      dataSource: Array.from({ length: 4 }).map((_, id) => ({ id: id + 96 })),
      loading: false,
      pagination: { current: 7, pageSize: 16, total: 100 },
    });
  });

  test('table query with filter', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<
          { total: number; list: { id: number }[] },
          void,
          { current: number; pageSize: number }
        >({ query: (_, params) => ({ url: '/list', params }) }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(),
    );

    await waitForNextUpdate();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });

    const id = [
      26, 190, 29, 80, 106, 52, 39, 74, 126, 194, 86, 72, 86, 159, 22, 73, 54,
      60, 95, 8,
    ];

    act(() => {
      result.current.tableProps.onChange({ current: 2, pageSize: 8 }, { id });
    });

    await waitForNextUpdate();

    const list = Object.values(
      id
        .filter((id) => id < 100)
        .reduce((prev, curr) => ({ ...prev, [curr]: curr }), {}),
    ).map((id) => ({ id }));

    expect(result.current.data).toEqual({
      total: list.length,
      list: list.slice(8, 16),
    });
  });

  test('table query with sorter', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<
          { total: number; list: { id: number }[] },
          void,
          { current: number; pageSize: number; filter: any }
        >({ query: '/list' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(),
    );

    await waitForNextUpdate();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });

    act(() => {
      result.current.tableProps.onChange(
        { current: 2, pageSize: 8 },
        undefined,
        { field: 'id', order: 'descend' },
      );
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 8 }).map((_, id) => ({ id: 91 - id })),
    });
  });
});

describe('pagination query endpoint', () => {
  test('simple pagination query', async () => {
    const { useGetListPaginationQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.paginationQuery<
          { total: number; list: { id: number }[] },
          void,
          { current: number; pageSize: number }
        >({ query: '/list' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListPaginationQuery(),
    );

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);
    expect(result.current.pagination).toMatchObject({
      current: 1,
      pageSize: 10,
      total: 0,
      totalPage: 0,
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.pagination).toMatchObject({
      current: 1,
      pageSize: 10,
      total: 100,
      totalPage: 10,
    });

    act(() => {
      result.current.pagination.onChange(7, 16);
    });

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.pagination).toMatchObject({
      current: 7,
      pageSize: 16,
      total: 100,
      totalPage: 7,
    });

    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 4 }).map((_, id) => ({ id: id + 96 })),
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.pagination).toMatchObject({
      current: 7,
      pageSize: 16,
      total: 100,
      totalPage: 7,
    });
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

describe('unknown endpoint', () => {
  test('simple unknown', () => {
    const api = createApi({
      endpoints: () => ({
        ignore: { type: 'unknown' as any, query: '/unknown' },
      }),
    });

    expect(api).toEqual({});
  });
});
