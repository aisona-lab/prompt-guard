// prompt-guard base detector — abstract base class

import { Finding, NormalizedPrompt } from "../models";

export abstract class BaseDetector {
  abstract name: string;
  enabled: boolean = true;

  abstract detect(prompt: NormalizedPrompt): Finding[];

  isEnabled(): boolean {
    return this.enabled;
  }
}
