import { QueryClient, QueryClientProvider } from "react-query"

const queryClient = new QueryClient()

export const ContextProviders = ({ children }: any) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
