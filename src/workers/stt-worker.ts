import * as ort from "onnxruntime-web";
import {
  processCtcOutput,
  loadTokens,
  computeMelSpectrogram,
  applyL1Scoring
} from "../lib/speechUtils";
import type { SttWorkerRequest, SttWorkerResponse } from "../lib/types";

let session: ort.InferenceSession | null = null;

function post(msg: SttWorkerResponse) {
  self.postMessage(msg);
}

async function initModel(modelUrl: string) {
  try {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    // Load tokens.txt for BPE tokenizer
    const tokensUrl = modelUrl.replace(/[^/]+$/, "tokens.txt");
    const tokensResponse = await fetch(tokensUrl);
    const tokensText = await tokensResponse.text();
    loadTokens(tokensText);

    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all"
    });

    post({ type: "ready" });
  } catch (err) {
    post({
      type: "error",
      error: `Failed to load model: ${err instanceof Error ? err.message : String(err)}`
    });
  }
}

async function recognize(
  audioData: Float32Array,
  expectedText: string,
  l1?: string
) {
  if (!session) {
    post({ type: "error", error: "Model not loaded" });
    return;
  }

  try {
    post({ type: "progress", progress: 0.3 });

    // Compute 80-channel mel spectrogram (model expects [1, 80, T] not raw audio)
    const { data: melData, numFrames } = computeMelSpectrogram(audioData);

    const audioTensor = new ort.Tensor("float32", melData, [1, 80, numFrames]);
    const lengthTensor = new ort.Tensor(
      "int64",
      BigInt64Array.from([BigInt(numFrames)]),
      [1]
    );

    const feeds: Record<string, ort.Tensor> = {
      audio_signal: audioTensor,
      length: lengthTensor
    };

    post({ type: "progress", progress: 0.5 });

    const results = await session.run(feeds);

    post({ type: "progress", progress: 0.8 });

    const outputKey = session.outputNames[0];
    const output = results[outputKey];
    const logits = output.data as Float32Array;
    const shape: [number, number] = [
      output.dims[1] as number,
      output.dims[2] as number
    ];

    let result = processCtcOutput(logits, shape, expectedText);

    if (l1) {
      result = applyL1Scoring(result, l1);
    }

    post({ type: "result", result });
  } catch (err) {
    post({
      type: "error",
      error: `Recognition failed: ${err instanceof Error ? err.message : String(err)}`
    });
  }
}

self.onmessage = async (event: MessageEvent<SttWorkerRequest>) => {
  const { type, audioData, expectedText, modelUrl, l1 } = event.data;

  switch (type) {
    case "init":
      if (modelUrl) await initModel(modelUrl);
      break;
    case "recognize":
      if (audioData && expectedText)
        await recognize(audioData, expectedText, l1);
      break;
  }
};
