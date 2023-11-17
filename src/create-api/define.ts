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
import type { AxiosRequestConfig } from 'axios';

/**
 * 基础接口定义
 */
export interface BaseEndpointDefinition<
  Response = void,
  Request = void,
  Params = void,
> {
  query:
    | string
    | AxiosRequestConfig
    | ((request: Request, params: Params) => AxiosRequestConfig);
  transformResponse?: (data: any) => Response;
  errorHandlerParams?: any;
}

/**
 * 查询接口定义
 */
export interface QueryEndpointDefinition<Response, Request = void>
  extends BaseEndpointDefinition<Response, Request> {
  type: 'query';
  options?:
    | Options<Response, []>
    | ((request: Request) => Options<Response, []>);
}

/**
 * 查询接口
 */
export type QueryEndpoint<Definition> =
  Definition extends QueryEndpointDefinition<infer Response, infer Request>
    ? (
        request: Request,
        options?: Options<Response, []>,
      ) => Result<Response, []>
    : never;

/**
 * 表格查询接口定义
 */
export interface TableQueryEndpointDefinition<
  Response extends TableData,
  Request,
  Params extends TableParams[0],
> extends BaseEndpointDefinition<Response, Request, Params> {
  type: 'tableQuery';
  options?:
    | AntdTableOptions<Response, [Params]>
    | ((request: Request) => AntdTableOptions<Response, [Params]>);
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
        options?: AntdTableOptions<Response, [Params]>,
      ) => AntdTableResult<Response, [Params]>
    : never;

/**
 * 分页查询接口定义
 */
export interface PaginationQueryEndpointDefinition<
  Response extends PaginationData,
  Request,
  Params extends PaginationParams[0],
> extends BaseEndpointDefinition<Response, Request, Params> {
  type: 'paginationQuery';
  options?:
    | PaginationOptions<Response, [Params]>
    | ((request: Request) => PaginationOptions<Response, [Params]>);
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
        options?: PaginationOptions<Response, [Params]>,
      ) => PaginationResult<Response, [Params]>
    : never;

export type MutateOptions<TData, TParams extends any[]> = Options<
  TData,
  TParams
> & {
  autoRefresh?: () => void;
  autoMutate?: (updater: (data?: TParams[0]) => TParams[0] | undefined) => void;
};

/**
 * 修改接口定义
 */
export interface MutateEndpointDefinition<
  Response = void,
  Request = void,
  Params = void,
> extends BaseEndpointDefinition<Response, Request, Params> {
  type: 'mutate';
  options?:
    | MutateOptions<Response, [Params]>
    | ((request: Request) => MutateOptions<Response, [Params]>);
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
        options?: MutateOptions<Response, [Params]>,
      ) => Result<Response, [Params]>
    : never;

/**
 * 接口定义生成器
 */
export interface EndpointDefinitionBuilder {
  query: <Response, Request = void>(
    definition: Omit<QueryEndpointDefinition<Response, Request>, 'type'>,
  ) => QueryEndpointDefinition<Response, Request>;

  tableQuery: <
    Response extends TableData,
    Request,
    Params extends TableParams[0],
  >(
    definition: Omit<
      TableQueryEndpointDefinition<Response, Request, Params>,
      'type'
    >,
  ) => TableQueryEndpointDefinition<Response, Request, Params>;

  paginationQuery: <
    Response extends PaginationData,
    Request,
    Params extends PaginationParams[0],
  >(
    definition: Omit<
      PaginationQueryEndpointDefinition<Response, Request, Params>,
      'type'
    >,
  ) => PaginationQueryEndpointDefinition<Response, Request, Params>;

  mutate: <Response = void, Request = void, Params = void>(
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
  | QueryEndpointDefinition<any, any>
  | TableQueryEndpointDefinition<any, any, any>
  | PaginationQueryEndpointDefinition<any, any, any>
  | MutateEndpointDefinition<any, any, any>
>;

/**
 * API 配置
 */
export interface ApiConfig<Definitions extends EndpointDefinitions> {
  axiosConfig?: AxiosRequestConfig;
  transformResponse?: (data: any) => any;
  endpoints: (builder: EndpointDefinitionBuilder) => Definitions;
  useErrorHandler?: (params?: any) => (error: any) => void;
}

/**
 * 创建 API
 */
export type CreateApi = <Definitions extends EndpointDefinitions>(
  config: ApiConfig<Definitions>,
) => {
  [key in keyof Definitions & string as `use${Capitalize<key>}${Capitalize<
    Definitions[key]['type']
  >}`]:
    | QueryEndpoint<Definitions[key]>
    | TableQueryEndpoint<Definitions[key]>
    | PaginationQueryEndpoint<Definitions[key]>
    | MutateEndpoint<Definitions[key]>;
};
