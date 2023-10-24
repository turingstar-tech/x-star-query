# createApi

```tsx
import { createApi } from 'x-star-query';

const useErrorHandler = (params: { path: string }) => {
  return (error: any) => console.log(params.path, error);
};

const { useGetTopContestQuery, useGet404ErrorQuery } = createApi({
  axiosConfig: { baseURL: 'https://strapi.turingstar.com.cn/api' },

  endpoints: (builder) => ({
    getTopContest: builder.query<string>({
      query: { url: '/course-publicities/1' },
      transformResponse: ({ data }) => data.data,
    }),

    get404Error: builder.query<string>({
      query: { url: '/course-publicity/1' },
      errorHandlerParams: { path: '/course-publicity/1' },
    }),
  }),

  useErrorHandler,
});

export default () => {
  const { data, loading, refreshAsync } = useGetTopContestQuery(undefined, {
    pollingInterval: 5000,
  });

  const { error } = useGet404ErrorQuery();

  return (
    <>
      <button onClick={refreshAsync}>重新获取</button>
      <div
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {loading ? '加载中' : JSON.stringify(data)}
      </div>
      <hr />
      <div style={{ color: 'red' }}>{error?.message}</div>
    </>
  );
};
```
