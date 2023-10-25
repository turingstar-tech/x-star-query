import type {
  AntdTableOptions,
  AntdTableResult,
  Data,
} from 'ahooks/es/useAntdTable/types';
import type { Options, Result } from 'ahooks/es/useRequest/src/types';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * 基础接口定义
 */
export interface BaseEndpointDefinition<Response = void, Request = void> {
  type: string;
  query:
    | (string | AxiosRequestConfig)
    | ((request: Request) => string | AxiosRequestConfig);
  transformResponse?: (response: AxiosResponse) => Response;
  errorHandlerParams?: any;
}

/**
 * 查询接口定义
 */
export interface QueryEndpointDefinition<Response, Request = void>
  extends BaseEndpointDefinition<Response, Request> {
  type: 'query';
}

/**
 * 查询接口
 */
export type QueryEndpoint<Definition> =
  Definition extends QueryEndpointDefinition<infer Response, infer Request>
    ? (
        request: Request,
        options?: Options<Response, never>,
      ) => Result<Response, never>
    : never;

/**
 * 表格查询接口定义
 */
export interface TableQueryEndpointDefinition<
  Response extends Data,
  Request = void,
> extends BaseEndpointDefinition<Response, Request> {
  type: 'tableQuery';
}

/**
 * 表格查询接口
 */
export type TableQueryEndpoint<Definition> =
  Definition extends TableQueryEndpointDefinition<infer Response, infer Request>
    ? (
        request: Request,
        options?: AntdTableOptions<Response, never>,
      ) => AntdTableResult<Response, never>
    : never;

/**
 * 修改接口定义
 */
export interface MutateEndpointDefinition<Response = void, Request = void>
  extends BaseEndpointDefinition<Response, Request> {
  type: 'mutate';
}

/**
 * 修改接口
 */
export type MutateEndpoint<Definition> =
  Definition extends MutateEndpointDefinition<infer Response, infer Request>
    ? (options?: Options<Response, [Request]>) => Result<Response, [Request]>
    : never;

/**
 * 接口定义生成器
 */
export interface EndpointDefinitionBuilder {
  query: <Response, Request = void>(
    definition: Omit<QueryEndpointDefinition<Response, Request>, 'type'>,
  ) => QueryEndpointDefinition<Response, Request>;

  tableQuery: <Response extends Data, Request = void>(
    definition: Omit<TableQueryEndpointDefinition<Response, Request>, 'type'>,
  ) => TableQueryEndpointDefinition<Response, Request>;

  mutate: <Response = void, Request = void>(
    definition: Omit<MutateEndpointDefinition<Response, Request>, 'type'>,
  ) => MutateEndpointDefinition<Response, Request>;
}

/**
 * 接口定义映射
 */
export type EndpointDefinitions = Record<
  string,
  | QueryEndpointDefinition<any, any>
  | TableQueryEndpointDefinition<any, any>
  | MutateEndpointDefinition<any, any>
>;

/**
 * API 配置
 */
export interface ApiConfig<Definitions extends EndpointDefinitions> {
  axiosConfig: AxiosRequestConfig;
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
    | MutateEndpoint<Definitions[key]>;
};
