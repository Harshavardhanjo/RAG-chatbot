// Define your models here.

export interface Model {
  id: string;
  label: string;
  apiIdentifier: string;
  description: string;
}

export const models: Array<Model> = [
  {
    id: "gpt-5.2",
    label: "GPT 5.2",
    apiIdentifier: "gpt-5.2",
    description: "Latest frontier model for complex tasks and reasoning",
  },
  {
    id: "gpt-5-mini",
    label: "GPT 5 mini",
    apiIdentifier: "gpt-5-mini",
    description: "Fast, cost-efficient model for everyday tasks",
  },
  {
    id: "gpt-4o",
    label: "GPT 4o",
    apiIdentifier: "gpt-4o",
    description: "Previous generation flagship model",
  },
  {
    id: "gpt-4o-mini",
    label: "GPT 4o mini",
    apiIdentifier: "gpt-4o-mini",
    description: "Small model for fast, lightweight tasks",
  },
] as const;

export const DEFAULT_MODEL_NAME: string = "gpt-5.2";
