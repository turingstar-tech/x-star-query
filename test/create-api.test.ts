import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-hooks';
import type { AxiosRequestConfig } from 'axios';
import createApi from '../src/create-api';

jest.useFakeTimers();

// 模拟 Axios 实例
jest.mock('axios', () => ({
  create: () => {
    // 模拟服务器数据
    let store: Record<string, string> = { hello: 'world!', good: 'night.' };
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
              return { data: null };
            }
            return { data: undefined };
          }

          case '/store/key': {
            if (method === 'GET') {
              return { data: store[params.key] };
            } else if (method === 'POST') {
              store[data.key] = data.value;
              return { data: null };
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
              if (params.factor) {
                result = result.filter((item) => item.id % params.factor === 0);
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

  CancelToken: {
    source: () => ({
      cancel: () => {},
    }),
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

    jest.runAllTimers();
    await waitForNextUpdate();

    // 请求成功有数据，加载完成
    expect(result.current.data).toEqual({ hello: 'world!', good: 'night.' });
    expect(result.current.loading).toBe(false);
  });

  test('refresh deps', async () => {
    const query = jest.fn((request: any) => ({
      url: '/store/key',
      params: request,
    }));
    const options = jest.fn((request: any) => ({
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
    expect(query).toHaveBeenNthCalledWith(1, { key: 'hello' }, undefined);

    // 选项函数调用 2 次，即组件渲染 2 次
    expect(options).toHaveBeenCalledTimes(2);
    expect(options).toHaveBeenNthCalledWith(1, { key: 'hello' });
    expect(options).toHaveBeenNthCalledWith(2, { key: 'hello' });

    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);

    jest.runAllTimers();
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
    expect(query).toHaveBeenNthCalledWith(2, { key: 'good' }, undefined);

    // 选项函数又调用 2 次，即组件又渲染 2 次
    expect(options).toHaveBeenCalledTimes(5);
    expect(options).toHaveBeenNthCalledWith(4, { key: 'good' });
    expect(options).toHaveBeenNthCalledWith(5, { key: 'good' });

    expect(result.current.data).toBe('world!');
    expect(result.current.loading).toBe(true);

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(query).toHaveBeenCalledTimes(2);

    // 选项函数又调用 1 次，即组件又渲染 1 次
    expect(options).toHaveBeenCalledTimes(6);
    expect(options).toHaveBeenNthCalledWith(6, { key: 'good' });

    // 请求成功有新数据
    expect(result.current.data).toBe('night.');
    expect(result.current.loading).toBe(false);
  });

  test('error handler', async () => {
    const transformResponse = jest.fn((data: any) => {
      if (data === undefined) {
        throw new Error('not found');
      }
      return data;
    });
    const errorHandler = jest.fn();
    const useErrorHandler = jest.fn(() => errorHandler);

    const { useThrowErrorQuery } = createApi({
      endpoints: (builder) => ({
        throwError: builder.query<void>({
          query: { url: '/error' },
          errorHandlerParams: { type: 'default' },
          options: { transformResponse },
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

    jest.runAllTimers();
    await waitForNextUpdate();

    // 响应转换函数调用 1 次，即请求响应 1 次
    expect(transformResponse).toHaveBeenCalledTimes(1);
    expect(transformResponse).toHaveBeenNthCalledWith(1, undefined);

    // 错误处理函数调用 1 次，即请求失败 1 次
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenNthCalledWith(1, new Error('not found'));

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
        getList: builder.tableQuery<{ total: number; list: { id: number }[] }>({
          query: '/list',
        }),
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

    jest.runAllTimers();
    await waitForNextUpdate();

    // 表格请求在第 2 次渲染时才开始加载
    expect(result.current.data).toBe(undefined);
    expect(result.current.loading).toBe(true);
    expect(result.current.tableProps).toMatchObject({
      dataSource: [],
      loading: true,
      pagination: { current: 1, pageSize: 10, total: 0 },
    });

    jest.runAllTimers();
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

    jest.runAllTimers();
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

  test('filters', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<{ total: number; list: { id: number }[] }>({
          query: (_, pagination) => ({ url: '/list', params: pagination }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(),
    );

    jest.runAllTimers();
    await waitForNextUpdate();
    jest.runAllTimers();
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

    jest.runAllTimers();
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

  test('sorter', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<{ total: number; list: { id: number }[] }>({
          query: '/list',
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(),
    );

    jest.runAllTimers();
    await waitForNextUpdate();
    jest.runAllTimers();
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

    jest.runAllTimers();
    await waitForNextUpdate();

    // 请求成功有新数据
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 8 }).map((_, id) => ({ id: 91 - id })),
    });
  });

  test('polling interval', async () => {
    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<
          { total: number; list: { id: number }[] },
          number
        >({
          query: { url: '/list', params: { current: 1, pageSize: 10 } },
          options: (request) => ({ pollingInterval: request }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListTableQuery(3000),
    );

    jest.runAllTimers();
    await waitForNextUpdate();
    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);

    act(() => {
      jest.runAllTimers();
    });

    // 轮询加载
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(true);

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);
  });

  test('sync search params to location', async () => {
    history.replaceState({}, '', '?id=1');

    const { useGetListTableQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.tableQuery<
          { total: number; list: { id: number }[] },
          void,
          { id: string; factor?: number }
        >({
          query: (_, pagination, params) => ({
            url: '/list',
            params: { ...pagination, filters: { id: [+params.id] } },
          }),
          options: { paramsSyncLocation: true },
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() => {
      let fields = {};
      return useGetListTableQuery(undefined, {
        form: {
          getInternalHooks: () => {},
          setFieldsValue: (value) => (fields = value),
          getFieldsValue: () => fields,
          resetFields: () => (fields = {}),
          validateFields: async () => fields,
        },
      });
    });

    jest.runAllTimers();
    await waitForNextUpdate();
    jest.runAllTimers();
    await waitForNextUpdate();

    expect(window.location.search).toBe('?current=1&pageSize=10&id=1');
    expect(result.current.data).toEqual({ total: 1, list: [{ id: 1 }] });

    act(() => {
      result.current.runAsync(
        { current: 1, pageSize: 1 },
        { id: '2', factor: undefined },
      );
    });

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(window.location.search).toBe('?current=1&pageSize=1&id=2');
    expect(result.current.data).toEqual({ total: 1, list: [{ id: 2 }] });
  });
});

describe('pagination query endpoint', () => {
  test('simple pagination query', async () => {
    const { useGetListPaginationQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.paginationQuery<{
          total: number;
          list: { id: number }[];
        }>({ query: '/list' }),
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

    jest.runAllTimers();
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

    jest.runAllTimers();
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

  test('default params', async () => {
    const { useGetListPaginationQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.paginationQuery<
          { total: number; list: { id: number }[] },
          void,
          { factor: number }
        >({
          query: (_, pagination, params) => ({
            url: '/list',
            params: { ...pagination, ...params },
          }),
          options: {
            defaultParams: [{ current: 2, pageSize: 8 }, { factor: 3 }],
          },
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListPaginationQuery(),
    );

    jest.runAllTimers();
    await waitForNextUpdate();

    // 请求成功有数据
    expect(result.current.data).toEqual({
      total: 34,
      list: Array.from({ length: 8 }).map((_, id) => ({ id: (id + 8) * 3 })),
    });
  });

  test('polling interval', async () => {
    const { useGetListPaginationQuery } = createApi({
      endpoints: (builder) => ({
        getList: builder.paginationQuery<
          { total: number; list: { id: number }[] },
          number
        >({
          query: { url: '/list', params: { current: 1, pageSize: 10 } },
          options: (request) => ({ pollingInterval: request }),
        }),
      }),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetListPaginationQuery(3000),
    );

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(false);

    act(() => {
      jest.runAllTimers();
    });

    // 轮询加载
    expect(result.current.data).toEqual({
      total: 100,
      list: Array.from({ length: 10 }).map((_, id) => ({ id })),
    });
    expect(result.current.loading).toBe(true);

    jest.runAllTimers();
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

    jest.runAllTimers();
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

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.update.loading).toBe(false);

    // 发送查询请求
    act(() => {
      result.current.get.runAsync();
    });

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求成功有新数据
    expect(result.current.get.data).toEqual({ what: 'for?' });
  });

  test('params', async () => {
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

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.get.data).toBe('night.');

    act(() => {
      result.current.update.runAsync({ key: 'good', value: 'morning.' });
    });

    expect(result.current.update.loading).toBe(true);

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.update.loading).toBe(false);

    act(() => {
      result.current.get.runAsync();
    });

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.get.data).toBe('morning.');
  });

  test('auto refresh and mutate', async () => {
    const { useGetStoreQuery, useUpdateStoreMutate, useUpdateErrorMutate } =
      createApi({
        transformResponse: async (data) => {
          if (data === undefined) {
            throw new Error('not found');
          }
          return data;
        },
        endpoints: (builder) => ({
          getStore: builder.query<object>({ query: '/store' }),
          updateStore: builder.mutate<void, void, object>({ query: '/store' }),
          updateError: builder.mutate<void, void, object>({ query: '/error' }),
        }),
        useErrorHandler: () => () => {},
      });

    const { result, waitForNextUpdate } = renderHook(() => {
      const get = useGetStoreQuery();
      const update = useUpdateStoreMutate(undefined, {
        autoRefresh: get.refresh,
        autoMutate: get.mutate,
      });
      const error = useUpdateErrorMutate(undefined, {
        autoRefresh: get.refresh,
        autoMutate: get.mutate,
      });
      return {
        get,
        update,
        error,
      };
    });

    // 查询初始无数据
    expect(result.current.get.data).toBe(undefined);
    expect(result.current.get.loading).toBe(true);

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求成功有数据
    expect(result.current.get.data).toEqual({
      hello: 'world!',
      good: 'night.',
    });
    expect(result.current.get.loading).toBe(false);

    // 发送修改请求
    act(() => {
      result.current.update.runAsync({ what: 'for?' });
    });

    // 查询请求自动修改
    expect(result.current.get.data).toEqual({ what: 'for?' });
    expect(result.current.get.loading).toBe(false);

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求自动刷新
    expect(result.current.get.data).toEqual({ what: 'for?' });
    expect(result.current.get.loading).toBe(true);

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求成功有新数据
    expect(result.current.get.data).toEqual({ what: 'for?' });
    expect(result.current.get.loading).toBe(false);

    const errorHandler = jest.fn();

    // 发送错误请求
    act(() => {
      result.current.error.runAsync({ move: 'forward!' }).catch(errorHandler);
    });

    // 查询请求自动修改
    expect(result.current.get.data).toEqual({ move: 'forward!' });
    expect(result.current.get.loading).toBe(false);

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求自动修改回原数据
    expect(result.current.get.data).toEqual({ what: 'for?' });
    expect(result.current.get.loading).toBe(false);
    expect(errorHandler).toHaveBeenCalledTimes(1);

    // 同时发送错误请求和修改请求
    act(() => {
      result.current.error.runAsync({ go: 'ahead.' }).catch(errorHandler);
      result.current.update.runAsync({ just: 'sleep?' });
    });

    // 查询请求自动修改
    expect(result.current.get.data).toEqual({ just: 'sleep?' });
    expect(result.current.get.loading).toBe(false);

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求自动刷新
    expect(result.current.get.data).toEqual({ just: 'sleep?' });
    expect(result.current.get.loading).toBe(true);
    expect(errorHandler).toHaveBeenCalledTimes(2);

    jest.runAllTimers();
    await waitForNextUpdate();

    // 查询请求成功有新数据
    expect(result.current.get.data).toEqual({ just: 'sleep?' });
    expect(result.current.get.loading).toBe(false);
  });

  test('polling interval', async () => {
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

    jest.runAllTimers();
    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);

    act(() => {
      jest.runAllTimers();
    });

    // 轮询加载
    expect(result.current.loading).toBe(true);

    jest.runAllTimers();
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
