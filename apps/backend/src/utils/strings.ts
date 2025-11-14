export const valueToOptionalString = ({ value }: { value: unknown }) =>
  value === null ? null : value?.toString();
