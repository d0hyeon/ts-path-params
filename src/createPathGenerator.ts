import { PathVariable, PathValue, SerializePath } from "./types";

type Pattern = Readonly<[string, string]>;
const EmptyString = '';
type EmptyString = typeof EmptyString;

export function createVariablePattern<Prefix extends string>(prefix: Prefix): readonly [Prefix, EmptyString];
export function createVariablePattern<Prefix extends string, Postfix extends string>(
  prefix: Prefix,
  postfix: Postfix
): readonly [Prefix, Postfix];
export function createVariablePattern<
  Prefix extends string,
  Postfix extends string = EmptyString
>(prefix: Prefix, postfix?: Postfix) {
  return postfix == null
    ? [prefix, EmptyString] as const
    : [prefix, postfix] as const;
}

type MergePathVariableByPattern<
  Path extends string,
  Patterns extends ReadonlyArray<Pattern>
> = Patterns extends [infer Item extends Pattern, ...infer Rest extends ReadonlyArray<Pattern>]
  ? PathVariable<Path, Item[0], Item[1]> & MergePathVariableByPattern<Path, Rest>
  : Record<never, never>;

type SerializePathByPatterns<
  Path extends string,
  Patterns extends ReadonlyArray<Pattern>,
  Variable extends Record<string, PathValue>
> = Patterns extends [infer Item extends Pattern, ...infer Rest extends ReadonlyArray<Pattern>]
  ? Exclude<SerializePath<Path, Item[0], Item[1], Variable> | SerializePathByPatterns<Path, Rest, Variable>, Path | never>
  : never;


export function createPathGenerator<Patterns extends ReadonlyArray<Pattern>>(...patterns: Patterns) {
  function generatePath<
    const Path extends string,
    const Variable extends Record<keyof MergePathVariableByPattern<Path, Patterns>, PathValue>
  >(path: Path, variables: Variable) {
    return Object.entries(variables).reduce((acc, [key, variable]) => {
      const regexps = patterns.map(([prefix, postfix]) => {
        if (postfix === EmptyString) {
          return `(\\${prefix}${key})`
        }
        return `(\\${prefix}${key}\\${postfix})`
      });
      const regexp = new RegExp(regexps.join('|'), 'g');

      return acc.replace(regexp, (variable as PathValue).toString());
    }, path) as SerializePathByPatterns<Path, Patterns, Variable>
  }

  return generatePath;
};
