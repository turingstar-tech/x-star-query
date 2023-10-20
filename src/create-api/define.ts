import type { useAntdTable, useRequest } from 'ahooks';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface BaseEndpointDefinition<
  Response extends unknown = void,
  Request extends unknown = void,
> {
  type: string;
  query:
    | string
    | AxiosRequestConfig
    | ((request: Request) => string | AxiosRequestConfig);
  transformResponse?: (response: AxiosResponse) => Response;
}

export interface QueryEndpointDefinition<
  Response extends unknown = void,
  Request extends unknown = void,
> extends BaseEndpointDefinition<Response, Request> {
  type: 'query';
}

export interface TableQueryEndpointDefinition<
  Response extends unknown = void,
  Request extends unknown = void,
> extends BaseEndpointDefinition<Response, Request> {
  type: 'tableQuery';
}

export interface MutateEndpointDefinition<
  Response extends unknown = void,
  Request extends unknown = void,
> extends BaseEndpointDefinition<Response, Request> {
  type: 'mutate';
}

export interface EndpointBuilder {
  query: <Response extends unknown = void, Request extends unknown = void>(
    definition: Omit<QueryEndpointDefinition<Response, Request>, 'type'>,
  ) => QueryEndpointDefinition<Response, Request>;

  tableQuery: <Response extends unknown = void, Request extends unknown = void>(
    definition: Omit<TableQueryEndpointDefinition<Response, Request>, 'type'>,
  ) => TableQueryEndpointDefinition<Response, Request>;

  mutate: <Response extends unknown = void, Request extends unknown = void>(
    definition: Omit<MutateEndpointDefinition<Response, Request>, 'type'>,
  ) => MutateEndpointDefinition<Response, Request>;
}

export type EndpointDefinitions = Record<
  string,
  BaseEndpointDefinition<any, any>
>;

export interface ApiConfig<T extends EndpointDefinitions> {
  axiosConfig: AxiosRequestConfig;
  endpoints: (builder: EndpointBuilder) => T;
}

export type CreateApi = <T extends EndpointDefinitions>(
  config: ApiConfig<T>,
) => {
  [key in keyof T & string as `use${Capitalize<key>}${Capitalize<
    T[key]['type']
  >}`]: ReturnType<
    T[key]['type'] extends 'tableQuery'
      ? typeof useAntdTable
      : typeof useRequest
  >;
};
