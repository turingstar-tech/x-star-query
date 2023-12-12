# baseCreateApi

`baseCreateApi` 创建一组请求 Hooks，用法可参考 `createApi`，与 `createApi` 的区别在于它接收一个 Axios 实例参数。

## API

### baseCreateApi

```ts
interface BaseCreateApi {
  <Definitions extends EndpointDefinitions>(
    instance: AxiosInstance,
    config: ApiConfig<Definitions>,
  ): ApiHooks<Definitions>;
}
```
