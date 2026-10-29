import { CodeError, runCode } from './interpreter';
import { checkInputs } from './examples';
import type { WorkerRequest, WorkerResponse } from './protocol';
import type { Frame } from '../algorithms/types';
const send = (message: WorkerResponse) => self.postMessage(message);
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, source, input, check } = event.data;
  let batch: Frame[] = [];
  const flush = () => {
    if (batch.length) {
      send({ id, type: 'frames', frames: batch });
      batch = [];
    }
  };
  try {
    if (check) {
      for (const values of checkInputs) {
        const result = runCode(source, values);
        if (!result.correct) {
          send({
            id,
            type: 'result',
            correct: false,
            output: result.output,
            checked: true,
            failedInput: values,
          });
          return;
        }
      }
      send({ id, type: 'result', correct: true, output: [], checked: true });
    } else {
      const result = runCode(source, input, {
        emit: (frame) => {
          batch.push(frame);
          if (batch.length === 64) flush();
        },
      });
      flush();
      send({
        id,
        type: 'result',
        correct: result.correct,
        output: result.output,
        checked: false,
      });
    }
  } catch (cause) {
    flush();
    const error =
      cause instanceof CodeError
        ? cause
        : new CodeError('Worker execution failed.');
    send({
      id,
      type: 'error',
      message: error.message,
      kind: error.kind,
      line: error.line,
    });
  }
};
