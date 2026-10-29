import type { Frame } from '../algorithms/types';
import type { FailureKind } from './interpreter';
export type WorkerRequest = {
  id: number;
  source: string;
  input: number[];
  check: boolean;
};
export type WorkerResponse =
  | { id: number; type: 'frames'; frames: Frame[] }
  | {
      id: number;
      type: 'result';
      correct: boolean;
      output: number[];
      checked: boolean;
      failedInput?: number[];
    }
  | {
      id: number;
      type: 'error';
      message: string;
      kind: FailureKind;
      line?: number;
    };
