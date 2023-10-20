import { CreateApi } from './define';

const createApi: CreateApi = () => {};
export default createApi;

// const c = createApi({
//   axiosConfig: {},
//   endpoints: (builder) => ({
//     getCll: builder.query<number, string>({
//       query: '',
//     }),
//     setCll: builder.mutate<string, number>({
//       query: '',
//     }),
//     getCllList: builder.tableQuery<{ list: []; total: number }>({
//       query: '',
//     }),
//   }),
// });

// const { params, data, refreshAsync } = c.useGetCllQuery('1', {
//   pollingInterval: 1,
// });

// const { params, runAsync } = c.useSetCllMutate();

// const { params, tableProps, refreshAsync } =
//   c.useGetCllListTableQuery(undefined);

// c.setErrorHandler;
