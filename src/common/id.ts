export const generateId = (prefix: string, length: number = 3): string => {
  const randomPart = Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
  return `${prefix}${randomPart}`;
};

export type Id<Tag extends string> = string & { readonly _tag: Tag };

export const asId = <Tag extends string>(id: string): Id<Tag> => id as Id<Tag>;

export const createIdFactory = <Tag extends string>(prefix: string) => {
  const fromString = (id: string): Id<Tag> => asId<Tag>(id);
  
  const generate = (length: number = 3): Id<Tag> => asId<Tag>(generateId(prefix, length));
  
  return {
    fromString,
    generate
  };
};

export const generateTimestamp = (): string => new Date().toISOString();

