import { Id, createIdFactory } from '../../common/id.js';
import { IssueId, Dimension } from '../issue/data_structure.js';
import { Result, ok, err } from 'neverthrow';
import { StringPhantom, createEnumStringPhantom } from '../../common/phantom.js';

export type BreakdownId = Id<'BreakdownId'>;

const breakdownIdFactory = createIdFactory<'BreakdownId'>('BD');
export const generateBreakdownId = breakdownIdFactory.generate;
export const makeBreakdownId = breakdownIdFactory.fromString;

// BreakdownTypeドメイン概念のファントム型
export type BreakdownType = StringPhantom<'BreakdownType'>;

// BreakdownTypeの列挙値
export const BREAKDOWN_TYPES = ['why', 'what', 'how'] as const;
export type BreakdownTypeEnum = typeof BREAKDOWN_TYPES[number];

// 特別な値
export const WHY_TYPE: BreakdownType = 'why' as BreakdownType;
export const WHAT_TYPE: BreakdownType = 'what' as BreakdownType;
export const HOW_TYPE: BreakdownType = 'how' as BreakdownType;

// BreakdownTypeドメイン概念のエラー型
export interface InvalidBreakdownTypeError {
  readonly _tag: "InvalidBreakdownType";
  readonly value: string;
}

export const BreakdownTypeError = {
  invalidBreakdownType: (value: string): InvalidBreakdownTypeError => ({
    _tag: "InvalidBreakdownType",
    value
  }),
  
  isInvalidBreakdownType: (error: object): error is InvalidBreakdownTypeError => 
    error !== null && 
    '_tag' in error && 
    (error as { _tag: string })._tag === "InvalidBreakdownType",
  
  getMessage: (error: InvalidBreakdownTypeError): string => 
    `無効なブレイクダウンタイプです: ${error.value}。有効な値: why, what, how`
};

export type BreakdownTypeResult<T> = Result<T, InvalidBreakdownTypeError>;

// BreakdownTypeファントム型ファクトリ
const breakdownTypeFactory = createEnumStringPhantom<
  'BreakdownType', 
  BreakdownTypeEnum,
  InvalidBreakdownTypeError
>(
  BREAKDOWN_TYPES,
  value => BreakdownTypeError.invalidBreakdownType(value)
);

// BreakdownTypeファントム型の作成
export const createBreakdownType = (value: string): BreakdownTypeResult<BreakdownType> => 
  breakdownTypeFactory.fromBase(value);

// ブレイクダウンタイプの表示名を取得
export const getBreakdownTypeDisplayName = (type: BreakdownType): string => {
  switch (type) {
    case WHY_TYPE: return "Why（理由）";
    case WHAT_TYPE: return "What（内容）";
    case HOW_TYPE: return "How（方法）";
    default: return type as string;
  }
};

// DecomposeTypeドメイン概念のファントム型
export type DecomposeType = StringPhantom<'DecomposeType'>;

// DecomposeTypeの列挙値
export const DECOMPOSE_TYPES = ['AND', 'OR'] as const;
export type DecomposeTypeEnum = typeof DECOMPOSE_TYPES[number];

// 特別な値
export const AND_TYPE: DecomposeType = 'AND' as DecomposeType;
export const OR_TYPE: DecomposeType = 'OR' as DecomposeType;

// DecomposeTypeドメイン概念のエラー型
export interface InvalidDecomposeTypeError {
  readonly _tag: "InvalidDecomposeType";
  readonly value: string;
}

export const DecomposeTypeError = {
  invalidDecomposeType: (value: string): InvalidDecomposeTypeError => ({
    _tag: "InvalidDecomposeType",
    value
  }),
  
  isInvalidDecomposeType: (error: object): error is InvalidDecomposeTypeError => 
    error !== null && 
    '_tag' in error && 
    (error as { _tag: string })._tag === "InvalidDecomposeType",
  
  getMessage: (error: InvalidDecomposeTypeError): string => 
    `無効な分解タイプです: ${error.value}。有効な値: AND, OR`
};

export type DecomposeTypeResult<T> = Result<T, InvalidDecomposeTypeError>;

// DecomposeTypeファントム型ファクトリ
const decomposeTypeFactory = createEnumStringPhantom<
  'DecomposeType', 
  DecomposeTypeEnum,
  InvalidDecomposeTypeError
>(
  DECOMPOSE_TYPES,
  value => DecomposeTypeError.invalidDecomposeType(value)
);

// DecomposeTypeファントム型の作成
export const createDecomposeType = (value: string): DecomposeTypeResult<DecomposeType> => 
  decomposeTypeFactory.fromBase(value);

// 分解タイプの表示名を取得
export const getDecomposeTypeDisplayName = (type: DecomposeType): string => {
  switch (type) {
    case AND_TYPE: return "AND（すべて必要）";
    case OR_TYPE: return "OR（いずれか必要）";
    default: return type as string;
  }
};

// 分解タイプの説明を取得
export const getDecomposeTypeDescription = (type: DecomposeType): string => {
  switch (type) {
    case AND_TYPE: return "すべての子論点が必要（論理積）";
    case OR_TYPE: return "いずれかの子論点が必要（論理和）";
    default: return "不明な分解タイプ";
  }
};

export interface Breakdown {
  readonly id: BreakdownId;
  readonly parentIssueId: IssueId;
  readonly childIssueIds: IssueId[];
  readonly type: BreakdownType;
  readonly dimension: Dimension;
  readonly decomposeType: DecomposeType;
  readonly createdAt: string;
}

export const createBreakdown = (
  parentIssueId: IssueId,
  childIssueIds: IssueId[],
  type: BreakdownType,
  dimension: Dimension,
  decomposeType: DecomposeType
): Breakdown => {
  return {
    id: generateBreakdownId(),
    parentIssueId,
    childIssueIds,
    type,
    dimension,
    decomposeType,
    createdAt: new Date().toISOString()
  };
};

export interface InvalidBreakdownStructureError { 
  readonly _tag: "InvalidBreakdownStructure"; 
  readonly message: string;
}

export interface InconsistentBreakdownError { 
  readonly _tag: "InconsistentBreakdown"; 
  readonly expectedType?: BreakdownType;
  readonly expectedDimension?: Dimension;
}

export interface TooManyChildrenError { 
  readonly _tag: "TooManyChildren";
  readonly maxAllowed: number;
}

export interface NotEnoughChildrenError { 
  readonly _tag: "NotEnoughChildren";
  readonly minRequired: number;
}

export type BreakdownError = 
  | InvalidBreakdownStructureError
  | InconsistentBreakdownError
  | TooManyChildrenError
  | NotEnoughChildrenError;

export const BreakdownError = {
  invalidStructure: (message: string): InvalidBreakdownStructureError => 
    ({ _tag: "InvalidBreakdownStructure", message }),
  
  inconsistentBreakdown: (expectedType?: BreakdownType, expectedDimension?: Dimension): InconsistentBreakdownError => 
    ({ _tag: "InconsistentBreakdown", expectedType, expectedDimension }),
  
  tooManyChildren: (maxAllowed: number = 5): TooManyChildrenError => 
    ({ _tag: "TooManyChildren", maxAllowed }),
  
  notEnoughChildren: (minRequired: number = 2): NotEnoughChildrenError => 
    ({ _tag: "NotEnoughChildren", minRequired }),
  
  isInvalidStructure: (error: BreakdownError): error is InvalidBreakdownStructureError => 
    error._tag === "InvalidBreakdownStructure",
  
  isInconsistentBreakdown: (error: BreakdownError): error is InconsistentBreakdownError => 
    error._tag === "InconsistentBreakdown",
  
  isTooManyChildren: (error: BreakdownError): error is TooManyChildrenError => 
    error._tag === "TooManyChildren",
  
  isNotEnoughChildren: (error: BreakdownError): error is NotEnoughChildrenError => 
    error._tag === "NotEnoughChildren",
  
  getMessage: (error: BreakdownError): string => {
    switch (error._tag) {
      case "InvalidBreakdownStructure":
        return `ブレイクダウン構造が無効です: ${error.message}`;
      
      case "InconsistentBreakdown": {
        let message = "同じbreakdown branchにぶら下がるサブイシューは、同じ軸でMECEである必要があります。";
        
        if (error.expectedType) {
          message += ` 期待されるタイプ: ${error.expectedType}`;
        }
        
        if (error.expectedDimension) {
          message += ` 期待される次元: ${error.expectedDimension}`;
        }
        
        return message;
      }
      
      case "TooManyChildren":
        return `ブレイクダウンが多すぎます。最大${error.maxAllowed}個までの子論点にしてください。`;
      
      case "NotEnoughChildren":
        return `ブレイクダウンが足りません。最低${error.minRequired}個の子論点が必要です。`;
    }
  }
};

export interface BreakdownCollection {
  readonly breakdowns: Breakdown[];
}

export const emptyBreakdownCollection = (): BreakdownCollection => ({
  breakdowns: []
});

// ブレイクダウンタイプの説明を取得
export const getBreakdownTypeDescription = (type: BreakdownType): string => {
  switch (type) {
    case WHY_TYPE: return "理由や原因の探求";
    case WHAT_TYPE: return "要素や内容の説明";
    case HOW_TYPE: return "方法や手段の提示";
    default: return "不明なブレイクダウンタイプ";
  }
};