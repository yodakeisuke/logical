import { Result, ok, err } from "neverthrow";

export type Phantom<Base, Tag extends string> = Base & { readonly _type: Tag };

export const asPhantom = <Base, Tag extends string>(value: Base): Phantom<Base, Tag> => 
  value as Phantom<Base, Tag>;

export const createPhantom = <Base, Tag extends string, E>(
  value: Base,
  validator: (value: Base) => Result<Base, E>
): Result<Phantom<Base, Tag>, E> => {
  return validator(value).map(validValue => asPhantom<Base, Tag>(validValue));
};

export type StringPhantom<Tag extends string> = Phantom<string, Tag>;

export type NumberPhantom<Tag extends string> = Phantom<number, Tag>;

export type BooleanPhantom<Tag extends string> = Phantom<boolean, Tag>;

export const createPhantomFactory = <Base, Tag extends string, E>(
  validator: (value: Base) => Result<Base, E>,
  defaultCreator?: () => Base
) => {
  const fromBase = (value: Base): Result<Phantom<Base, Tag>, E> => 
    createPhantom<Base, Tag, E>(value, validator);
  
  const create = defaultCreator ? 
    (): Result<Phantom<Base, Tag>, E> => fromBase(defaultCreator()) :
    undefined;
  
  return {
    fromBase,
    create
  };
};

export const createStringPhantomFactory = <Tag extends string, E>(
  validator: (value: string) => Result<string, E>,
  defaultCreator?: () => string
) => createPhantomFactory<string, Tag, E>(validator, defaultCreator);

export const createNumberPhantomFactory = <Tag extends string, E>(
  validator: (value: number) => Result<number, E>,
  defaultCreator?: () => number
) => createPhantomFactory<number, Tag, E>(validator, defaultCreator);

export const createEnumStringPhantom = <
  Tag extends string,
  Values extends string,
  E
>(
  values: readonly Values[],
  errorCreator: (value: string) => E
) => {
  const validator = (value: string): Result<string, E> => {
    if ((values as readonly string[]).includes(value)) {
      return ok(value);
    }
    return err(errorCreator(value));
  };
  
  return createStringPhantomFactory<Tag, E>(validator);
};