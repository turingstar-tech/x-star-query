import type {
  AntdTableOptions,
  AntdTableResult,
  Data as TableData,
  Params as TableParams,
} from 'ahooks/es/useAntdTable/types';
import type {
  Data as PaginationData,
  PaginationOptions,
  Params as PaginationParams,
  PaginationResult,
} from 'ahooks/es/usePagination/types';
import type { Options, Result } from 'ahooks/es/useRequest/src/types';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * 基础接口定义
 */
export interface BaseEndpointDefinition<Request, Params extends any[]> {
  query:
    | string
    | AxiosRequestConfig
    | ((request: Request, ...params: Params) => AxiosRequestConfig);
  errorHandlerParams?: any;
}

/**
 * 查询接口选项
 */
export interface QueryOptions<Response, Params>
  extends Options<Response, Params extends void ? [] : [Params]> {
  transformResponse?: (data: any) => Response | Promise<Response>;
}

/**
 * 查询接口定义
 */
export interface QueryEndpointDefinition<Response, Request, Params>
  extends BaseEndpointDefinition<Request, Params extends void ? [] : [Params]> {
  type: 'query';
  options?:
    | QueryOptions<Response, Params>
    | ((request: Request) => QueryOptions<Response, Params>);
}

/**
 * 查询接口
 */
export type QueryEndpoint<Definition> =
  Definition extends QueryEndpointDefinition<
    infer Response,
    infer Request,
    infer Params
  >
    ? (
        request: Request,
        options?: QueryOptions<Response, Params>,
      ) => Result<Response, Params extends void ? [] : [Params]>
    : never;

/**
 * 表格查询接口选项
 */
export interface TableQueryOptions<
  Response extends TableData,
  Params extends void | object,
> extends AntdTableOptions<
    Response,
    Params extends void ? [TableParams[0]] : [TableParams[0], Params]
  > {
  transformResponse?: (data: any) => Response | Promise<Response>;
}

/**
 * 表格查询接口定义
 */
export interface TableQueryEndpointDefinition<
  Response extends TableData,
  Request,
  Params extends void | object,
> extends BaseEndpointDefinition<
    Request,
    Params extends void ? [TableParams[0]] : [TableParams[0], Params]
  > {
  type: 'tableQuery';
  options?:
    | TableQueryOptions<Response, Params>
    | ((request: Request) => TableQueryOptions<Response, Params>);
}

/**
 * 表格查询接口
 */
export type TableQueryEndpoint<Definition> =
  Definition extends TableQueryEndpointDefinition<
    infer Response,
    infer Request,
    infer Params
  >
    ? (
        request: Request,
        options?: TableQueryOptions<Response, Params>,
      ) => AntdTableResult<
        Response,
        Params extends void ? [TableParams[0]] : [TableParams[0], Params]
      >
    : never;

/**
 * 分页查询接口选项
 */
export interface PaginationQueryOptions<
  Response extends PaginationData,
  Params extends void | object,
> extends PaginationOptions<
    Response,
    Params extends void ? [PaginationParams[0]] : [PaginationParams[0], Params]
  > {
  transformResponse?: (data: any) => Response | Promise<Response>;
}

/**
 * 分页查询接口定义
 */
export interface PaginationQueryEndpointDefinition<
  Response extends PaginationData,
  Request,
  Params extends void | object,
> extends BaseEndpointDefinition<
    Request,
    Params extends void ? [PaginationParams[0]] : [PaginationParams[0], Params]
  > {
  type: 'paginationQuery';
  options?:
    | PaginationQueryOptions<Response, Params>
    | ((request: Request) => PaginationQueryOptions<Response, Params>);
}

/**
 * 分页查询接口
 */
export type PaginationQueryEndpoint<Definition> =
  Definition extends PaginationQueryEndpointDefinition<
    infer Response,
    infer Request,
    infer Params
  >
    ? (
        request: Request,
        options?: PaginationQueryOptions<Response, Params>,
      ) => PaginationResult<
        Response,
        Params extends void
          ? [PaginationParams[0]]
          : [PaginationParams[0], Params]
      >
    : never;

/**
 * 修改接口选项
 */
export interface MutateOptions<Response, Params>
  extends Options<Response, Params extends void ? [] : [Params]> {
  transformResponse?: (data: any) => Response | Promise<Response>;
  autoRefresh?: () => void;
  autoMutate?: (updater: (data?: Params) => Params | undefined) => void;
}

/**
 * 修改接口定义
 */
export interface MutateEndpointDefinition<Response, Request, Params>
  extends BaseEndpointDefinition<Request, Params extends void ? [] : [Params]> {
  type: 'mutate';
  options?:
    | MutateOptions<Response, Params>
    | ((request: Request) => MutateOptions<Response, Params>);
}

/**
 * 修改接口
 */
export type MutateEndpoint<Definition> =
  Definition extends MutateEndpointDefinition<
    infer Response,
    infer Request,
    infer Params
  >
    ? (
        request: Request,
        options?: MutateOptions<Response, Params>,
      ) => Result<Response, Params extends void ? [] : [Params]>
    : never;

/**
 * 接口定义生成器
 */
export interface EndpointDefinitionBuilder {
  query: <Response, Request = void, Params = void>(
    definition: Omit<
      QueryEndpointDefinition<Response, Request, Params>,
      'type'
    >,
  ) => QueryEndpointDefinition<Response, Request, Params>;

  tableQuery: <
    Response extends TableData,
    Request = void,
    Params extends void | object = void,
  >(
    definition: Omit<
      TableQueryEndpointDefinition<Response, Request, Params>,
      'type'
    >,
  ) => TableQueryEndpointDefinition<Response, Request, Params>;

  paginationQuery: <
    Response extends PaginationData,
    Request = void,
    Params extends void | object = void,
  >(
    definition: Omit<
      PaginationQueryEndpointDefinition<Response, Request, Params>,
      'type'
    >,
  ) => PaginationQueryEndpointDefinition<Response, Request, Params>;

  mutate: <Response, Request = void, Params = void>(
    definition: Omit<
      MutateEndpointDefinition<Response, Request, Params>,
      'type'
    >,
  ) => MutateEndpointDefinition<Response, Request, Params>;
}

/**
 * 接口定义映射
 */
export type EndpointDefinitions = Record<
  string,
  | QueryEndpointDefinition<any, any, any>
  | TableQueryEndpointDefinition<any, any, any>
  | PaginationQueryEndpointDefinition<any, any, any>
  | MutateEndpointDefinition<any, any, any>
>;

/**
 * API 配置
 */
export interface ApiConfig<Definitions extends EndpointDefinitions> {
  transformResponse?: (data: any) => any;
  endpoints: (builder: EndpointDefinitionBuilder) => Definitions;
  useErrorHandler?: (params?: any) => (error: Error) => void;
}

/**
 * API 钩子
 */
export type ApiHooks<Definitions extends EndpointDefinitions> = {
  [key in keyof Definitions & string as `use${Capitalize<key>}${Capitalize<
    Definitions[key]['type']
  >}`]:
    | QueryEndpoint<Definitions[key]>
    | TableQueryEndpoint<Definitions[key]>
    | PaginationQueryEndpoint<Definitions[key]>
    | MutateEndpoint<Definitions[key]>;
};

/**
 * 基础 API 创建函数
 */
export interface BaseCreateApi {
  <Definitions extends EndpointDefinitions>(
    instance: AxiosInstance,
    config: ApiConfig<Definitions>,
  ): ApiHooks<Definitions>;
}

/**
 * API 创建函数
 */
export interface CreateApi {
  <Definitions extends EndpointDefinitions>(
    config: ApiConfig<Definitions> & { axiosConfig?: AxiosRequestConfig },
  ): ApiHooks<Definitions>;
}

/**
 * 实例创建函数
 */
export interface CreateInstance {
  (axiosConfig?: AxiosRequestConfig): {
    instance: AxiosInstance;
    createApi: <Definitions extends EndpointDefinitions>(
      config: ApiConfig<Definitions>,
    ) => ApiHooks<Definitions>;
  };
}
