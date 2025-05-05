export const toJson = <T>(object: T, pretty: boolean = true): string => {
  return pretty
    ? JSON.stringify(object, null, 2)
    : JSON.stringify(object);
};

export const toJsonCodeblock = <T>(object: T): string => {
  return "```json\n" + toJson(object) + "\n```";
};