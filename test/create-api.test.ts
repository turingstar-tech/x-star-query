import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-hooks';
import type { AxiosRequestConfig } from 'axios';
import { createApi } from '../src';

jest.useFakeTimers();

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
          setTimeout(resolve, 500);
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
                result = result.filter((item) =>
                  params.filters.id.includes(item.id),
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

    // 初始无数据，正在加载
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有数据，加载完成
    expect(result.current.data).toEqual({ hello: 'world!', good: 'night.' });
    expect(result.current.loading).toBe(false);
  });

  test('query with refresh deps', async () => {
    const query = jest.fn((request) => ({
      url: '/store/key',
      params: request,
    }));
    const options = jest.fn<(request: any) => any>((request) => ({
      refreshDeps: [request.key],
    }));

    const { useGetStoreKeyQuery } = createApi({
      endpoints: (builder) => ({
        getStoreKey: builder.query<string, { key: string }>({ query, options }),
      }),
    });

    const { result, rerender, waitForNextUpdate } = renderHook(
      (props) => useGetStoreKeyQuery(props),
      { initialProps: { key: 'hello' } },
    );

    // 请求函数调用 1 次，即请求发送 1 次
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(1, { key: 'hello' });

    // 选项函数调用 2 次，即组件渲染 2 次
    expect(options).toHaveBeenCalledTimes(2);
    expect(options).toHaveBeenNthCalledWith(1, { key: 'hello' });
    expect(options).toHaveBeenNthCalledWith(2, { key: 'hello' });

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(query).toHaveBeenCalledTimes(1);

    // 选项函数又调用 1 次，即组件又渲染 1 次
    expect(options).toHaveBeenCalledTimes(3);
    expect(options).toHaveBeenNthCalledWith(3, { key: 'hello' });

    // 请求成功有数据
    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(false);

    // 用新属性渲染
    rerender({ key: 'good' });

    // 请求函数又调用 1 次，即请求又发送 1 次
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(2, { key: 'good' });

    // 选项函数又调用 2 次，即组件又渲染 2 次
    expect(options).toHaveBeenCalledTimes(5);
    expect(options).toHaveBeenNthCalledWith(4, { key: 'good' });
    expect(options).toHaveBeenNthCalledWith(5, { key: 'good' });

    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(query).toHaveBeenCalledTimes(2);

    // 选项函数又调用 1 次，即组件又渲染 1 次
    expect(options).toHaveBeenCalledTimes(6);
    expect(options).toHaveBeenNthCalledWith(6, { key: 'good' });

    // 请求成功有新数据
    expect(result.current.data).toBe('night.');
    expect(result.current.loading).toBe(false);
  });

  test('query with error', async () => {
    const transformResponse = jest.fn((data) => {
      if (data === undefined) {
        throw new Error('not found');
      }
      return data;
    });
    const errorHandler = jest.fn();
    const useErrorHandler = jest.fn(() => errorHandler);

    const { useThrowErrorQuery } = createApi({
      transformResponse,
      endpoints: (builder) => ({
        throwError: builder.query<void>({
          query: { url: '/error' },
          errorHandlerParams: { type: 'default' },
        }),
      }),
      useErrorHandler,
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useThrowErrorQuery(),
    );

    expect(transformResponse).toHaveBeenCalledTimes(0);

    expect(errorHandler).toHaveBeenCalledTimes(0);

    // 错误处理钩子调用 2 次，即组件渲染 2 次
    expect(useErrorHandler).toHaveBeenCalledTimes(2);
    expect(useErrorHandler).toHaveBeenNthCalledWith(1, { type: 'default' });
    expect(useErrorHandler).toHaveBeenNthCalledWith(2, { type: 'default' });

    // 初始无错误
    expect(result.current.error).toBe(undefined);
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 响应转换函数调用 1 次，即请求响应 1 次
    expect(transformResponse).toHaveBeenCalledTimes(1);
    expect(transformResponse).toHaveBeenNthCalledWith(1, undefined);

    // 错误处理函数调用 1 次，即请求失败 1 次
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenNthCalledWith(1, new Error('not found'), []);

    // 错误处理钩子又调用 1 次，即组件又渲染 1 次
    expect(useErrorHandler).toHaveBeenCalledTimes(3);
    expect(useErrorHandler).toHaveBeenNthCalledWith(3, { type: 'default' });

    // 请求失败有错误
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

    // 初始表格属性
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(false);
    expect(result.current.tableProps).toMatchObject({
      dataSource: [],
      loading: false,
      pagination: { current: 1, pageSize: 10, total: 0 },
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 表格请求在第 2 次渲染时才开始加载
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);
    expect(result.current.tableProps).toMatchObject({
      dataSource: [],
      loading: true,
      pagination: { current: 1, pageSize: 10, total: 0 },
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有数据
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

    // 修改分页参数
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

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有新数据
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

  test('table query with filters', async () => {
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

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();
    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });

    const id = [
      26, 190, 29, 80, 106, 52, 39, 74, 126, 194, 86, 72, 86, 159, 22, 73, 54,
      60, 95, 8,
    ];

    // 修改分页和筛选参数
    act(() => {
      result.current.tableProps.onChange({ current: 2, pageSize: 8 }, { id });
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    const list = Object.values(
      id
        .filter((id) => id < 100)
        .reduce((prev, curr) => ({ ...prev, [curr]: curr }), {}),
    ).map((id) => ({ id }));

    // 请求成功有新数据
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
          { current: number; pageSize: number }
        >({ query: '/list' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(),
    );

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();
    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });

    // 修改分页和排序参数
    act(() => {
      result.current.tableProps.onChange(
        { current: 2, pageSize: 8 },
        undefined,
        { field: 'id', order: 'descend' },
      );
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有新数据
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 8 }).map((_, id) => ({ id: 91 - id })),
    });
  });

  test('table query with polling interval', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<
          { total: number; list: { id: number }[] },
          number,
          { current: number; pageSize: number }
        >({
          query: { url: '/list', params: { current: 1, pageSize: 10 } },
          options: (request) => ({ pollingInterval: request }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(3000),
    );

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();
    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    // 轮询加载
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);
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

    // 初始分页属性
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);
    expect(result.current.pagination).toMatchObject({
      current: 1,
      pageSize: 10,
      total: 0,
      totalPage: 0,
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有数据
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

    // 修改分页参数
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

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有新数据
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

  test('pagination query with default params', async () => {
    const { useGetListPaginationQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.paginationQuery<
          { total: number; list: { id: number }[] },
          void,
          { current: number; pageSize: number }
        >({
          query: (_, params) => ({ url: '/list', params }),
          options: { defaultParams: [{ current: 2, pageSize: 8 }] },
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListPaginationQuery(),
    );

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 请求成功有数据
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 8 }).map((_, id) => ({ id: id + 8 })),
    });
  });

  test('pagination query with polling interval', async () => {
    const { useGetListPaginationQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.paginationQuery<
          { total: number; list: { id: number }[] },
          number,
          { current: number; pageSize: number }
        >({
          query: { url: '/list', params: { current: 1, pageSize: 10 } },
          options: (request) => ({ pollingInterval: request }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListPaginationQuery(3000),
    );

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    // 轮询加载
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);
  });
});

describe('mutate endpoint', () => {
  test('simple mutate', async () => {
    const { useGetStoreQuery, useUpdateStoreMutate } = createApi({
      endpoints: (builder) => ({
        getStore: builder.query<object>({ query: '/store' }),
        updateStore: builder.mutate<void, void, object>({ query: '/store' }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() => ({
      get: useGetStoreQuery(),
      update: useUpdateStoreMutate(),
    }));

    // 初始不发送修改请求
    expect(result.current.update.loading).toBe(false);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 查询请求成功有数据
    expect(result.current.get.data).toEqual({
      hello: 'world!',
      good: 'night.',
    });

    // 发送修改请求
    act(() => {
      result.current.update.runAsync({ what: 'for?' });
    });

    expect(result.current.update.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.update.loading).toBe(false);

    // 发送查询请求
    act(() => {
      result.current.get.runAsync();
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    // 查询请求成功有新数据
    expect(result.current.get.data).toEqual({ what: 'for?' });
  });

  test('mutate with params', async () => {
    const { useGetStoreKeyQuery, useUpdateStoreKeyMutate } = createApi({
      endpoints: (builder) => ({
        getStoreKey: builder.query<string, { key: string }>({
          query: '/store/key',
        }),
        updateStoreKey: builder.mutate<
          void,
          void,
          { key: string; value: string }
        >({
          query: (_, params) => ({
            url: '/store/key',
            method: 'POST',
            data: params,
          }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() => ({
      get: useGetStoreKeyQuery({ key: 'good' }),
      update: useUpdateStoreKeyMutate(),
    }));

    expect(result.current.update.loading).toBe(false);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.get.data).toBe('night.');

    act(() => {
      result.current.update.runAsync({ key: 'good', value: 'morning.' });
    });

    expect(result.current.update.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.update.loading).toBe(false);

    act(() => {
      result.current.get.runAsync();
    });

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.get.data).toBe('morning.');
  });

  test('mutate with polling interval', async () => {
    const { useDeleteStoreMutate } = createApi({
      endpoints: (builder) => ({
        deleteStore: builder.mutate<void, number>({
          query: { url: '/store', method: 'POST', data: {} },
          options: (request) => ({ pollingInterval: request }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useDeleteStoreMutate(3000),
    );

    expect(result.current.loading).toBe(false);

    // 开始轮询
    act(() => {
      result.current.runAsync();
    });

    // 首次加载
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    // 轮询加载
    expect(result.current.loading).toBe(true);

    jest.runOnlyPendingTimers();
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
  });
});

describe('unknown endpoint', () => {
  test('simple unknown', () => {
    const api = createApi({
      endpoints: () => ({
        ignore: { type: 'unknown' as any, query: '/unknown' },
      }),
    });

    // 忽略未知请求
    expect(api).toEqual({});
  });
});
