import type { useAntdTable, useRequest } from 'ahooks';
import type { AntdTableOptions, Data } from 'ahooks/es/useAntdTable/types';
import type { Options } from 'ahooks/es/useRequest/src/types';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface BaseEndpointDefinition<Response = void, Request = void> {
  type: string;
  query:
    | string
    | AxiosRequestConfig
    | ((request: Request) => string | AxiosRequestConfig);
  transformResponse?: (response: AxiosResponse) => Response;
  errorHandlerParams?: unknown;
}

export interface QueryEndpointDefinition<Response, Request = void>
  extends BaseEndpointDefinition<Response, Request> {
  type: 'query';
}

export type QueryEndpoint<Definition> =
  Definition extends QueryEndpointDefinition<infer Response, infer Request>
    ? (
        request: Request,
        options?: Options<Response, never>,
      ) => ReturnType<typeof useRequest<Response, never>>
    : never;

export interface TableQueryEndpointDefinition<
  Response extends Data,
  Request = void,
> extends BaseEndpointDefinition<Response, Request> {
  type: 'tableQuery';
}

export type TableQueryEndpoint<Definition> =
  Definition extends TableQueryEndpointDefinition<infer Response, infer Request>
    ? (
        request: Request,
        options?: AntdTableOptions<Response, never>,
      ) => ReturnType<typeof useAntdTable<Response, never>>
    : never;

export interface MutateEndpointDefinition<Response = void, Request = void>
  extends BaseEndpointDefinition<Response, Request> {
  type: 'mutate';
}

export type MutateEndpoint<Definition> =
  Definition extends MutateEndpointDefinition<infer Response, infer Request>
    ? (
        options?: Options<Response, [Request]>,
      ) => ReturnType<typeof useRequest<Response, [Request]>>
    : never;

export interface EndpointBuilder {
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

export type EndpointDefinitions = Record<
  string,
  BaseEndpointDefinition<any, any>
>;

export interface ApiConfig<Definitions extends EndpointDefinitions> {
  axiosConfig: AxiosRequestConfig;
  endpoints: (builder: EndpointBuilder) => Definitions;
  useErrorHandler: (params: unknown) => (error: unknown) => void;
}

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
