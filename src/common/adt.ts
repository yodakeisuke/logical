export interface TaggedValue<Tag extends string> {
  readonly _tag: Tag;
}

export type Tagged<T extends string, P = {}> = TaggedValue<T> & P;

export type TaggedUnion<
  T extends Record<string, { [K in Tag]: string }>,
  Tag extends keyof T[keyof T] & string
> = {
  [K in keyof T]: Tagged<T[K][Tag], Omit<T[K], Tag>>;
}[keyof T];

export interface TypePredicate<T, U extends T> {
  (value: T): value is U;
}

export type MessageHandler<T extends TaggedValue<string>> = (value: T) => string;

export type Constructors<T extends TaggedValue<string>> = Record<string, (...args: unknown[]) => T>;

export type TypePredicates<T extends TaggedValue<string>> = {
  [K in T["_tag"] as `is${Capitalize<string & K>}`]: TypePredicate<T, Extract<T, { _tag: K }>>;
};

export const createTaggedUnion = <T extends TaggedValue<string>>(
  constructors: Constructors<T>,
  messageHandler: MessageHandler<T>
) => {
  const predicates = Object.fromEntries(
    Object.keys(constructors).map(key => {
      const tagName = getTagFromConstructorName(key);
      const predicateName = `is${capitalize(tagName)}`;
      const predicate = (error: T): boolean => error._tag === tagName;
      return [predicateName, predicate];
    })
  ) as TypePredicates<T>;
  
  const getMessage = messageHandler;

  return {
    ...constructors,
    ...predicates,
    getMessage
  };
};

const getTagFromConstructorName = (constructorName: string): string => {
  return constructorName.replace(/([a-z])([A-Z])/g, '$1$2')
    .replace(/^./, firstChar => firstChar.toUpperCase());
};

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};