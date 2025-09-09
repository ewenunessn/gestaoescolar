import { useParams as originalUseParams } from 'react-router-dom';

declare module 'react-router-dom' {
  export function useParams<T extends Record<string, string | undefined> = {}>(): T;
  export function useSearchParams(): [URLSearchParams, (params: URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)) => void];
}