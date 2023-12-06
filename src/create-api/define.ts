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
 * 响应转换函数
 */
export interface TransformResponse<Response, Request, Params> {
  (data: any, request: Request, params: Params): Response;
}

/**
 * 基础接口定义
 */
export interface BaseEndpointDefinition<Request, Params> {
  query:
    | string
    | AxiosRequestConfig
    | ((request: Request, params: Params) => AxiosRequestConfig);
  errorHandlerParams?: any;
}

/**
 * 查询接口选项
 */
export interface QueryOptions<Response, Request, Params>
  extends Options<Response, Params extends void ? [] : [Params]> {
  transformResponse?: TransformResponse<Response, Request, Params>;
}

/**
 * 查询接口定义
 */
export interface QueryEndpointDefinition<Response, Request, Params>
  extends BaseEndpointDefinition<Request, Params> {
  type: 'query';
  options?:
    | QueryOptions<Response, Request, Params>
    | ((request: Request) => QueryOptions<Response, Request, Params>);
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
        options?: QueryOptions<Response, Request, Params>,
      ) => Result<Response, Params extends void ? [] : [Params]>
    : never;

/**
 * 表格查询接口选项
 */
export interface TableQueryOptions<
  Response extends TableData,
  Request,
  Params extends void | object,
> extends AntdTableOptions<
    Response,
    Params extends void ? [TableParams[0]] : [TableParams[0], Params]
  > {
  transformResponse?: TransformResponse<
    Response,
    Request,
    Params extends void ? TableParams[0] : TableParams[0] & Params
  >;
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
    Params extends void ? TableParams[0] : TableParams[0] & Params
  > {
  type: 'tableQuery';
  options?:
    | TableQueryOptions<Response, Request, Params>
    | ((request: Request) => TableQueryOptions<Response, Request, Params>);
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
        options?: TableQueryOptions<Response, Request, Params>,
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
  Request,
  Params extends void | object,
> extends PaginationOptions<
    Response,
    Params extends void ? [PaginationParams[0]] : [PaginationParams[0], Params]
  > {
  transformResponse?: TransformResponse<
    Response,
    Request,
    Params extends void ? PaginationParams[0] : PaginationParams[0] & Params
  >;
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
    Params extends void ? PaginationParams[0] : PaginationParams[0] & Params
  > {
  type: 'paginationQuery';
  options?:
    | PaginationQueryOptions<Response, Request, Params>
    | ((request: Request) => PaginationQueryOptions<Response, Request, Params>);
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
        options?: PaginationQueryOptions<Response, Request, Params>,
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
export interface MutateOptions<Response, Request, Params>
  extends Options<Response, Params extends void ? [] : [Params]> {
  transformResponse?: TransformResponse<Response, Request, Params>;
  autoRefresh?: () => void;
  autoMutate?: (updater: (data?: Params) => Params | undefined) => void;
}

/**
 * 修改接口定义
 */
export interface MutateEndpointDefinition<Response, Request, Params>
  extends BaseEndpointDefinition<Request, Params> {
  type: 'mutate';
  options?:
    | MutateOptions<Response, Request, Params>
    | ((request: Request) => MutateOptions<Response, Request, Params>);
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
        options?: MutateOptions<Response, Request, Params>,
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
  axiosConfig?: AxiosRequestConfig;
  transformResponse?: TransformResponse<any, any, any>;
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
