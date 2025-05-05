import { 
  IssueId, generateIssueId, makeIssueId,
  IssueError, IssueCollection, emptyCollection,
  generateRelationId, makeRelationId
} from '../../term/issue/data_structure.js';

describe('Issue Data Structure', () => {
  describe('ID Functions', () => {
    test('generateIssueId creates IDs with I prefix', () => {
      const id = generateIssueId();
      expect(id.startsWith('I')).toBe(true);
    });

    test('makeIssueId converts string to IssueId', () => {
      const id = makeIssueId('I123');
      expect(id).toBe('I123');
    });

    test('generateRelationId creates IDs with R prefix', () => {
      const id = generateRelationId();
      expect(id.startsWith('R')).toBe(true);
    });

    test('makeRelationId converts string to RelationId', () => {
      const id = makeRelationId('R123');
      expect(id).toBe('R123');
    });
  });

  describe('Collection Functions', () => {
    test('emptyCollection creates empty issue collection', () => {
      const collection = emptyCollection();
      expect(collection.issues).toEqual([]);
      expect(collection.relations).toEqual([]);
    });
  });

  describe('IssueError Constructors', () => {
    test('emptyTitle creates EmptyTitleError', () => {
      const error = IssueError.emptyTitle();
      expect(error._tag).toBe('EmptyTitle');
    });

    test('titleTooLong creates TitleTooLongError', () => {
      const error = IssueError.titleTooLong(100);
      expect(error._tag).toBe('TitleTooLong');
      expect(error.maxLength).toBe(100);
    });

    test('rootAlreadyExists creates RootAlreadyExistsError', () => {
      const error = IssueError.rootAlreadyExists();
      expect(error._tag).toBe('RootAlreadyExists');
    });

    test('issueNotFound creates IssueNotFoundError', () => {
      const issueId = makeIssueId('I123');
      const error = IssueError.issueNotFound(issueId);
      expect(error._tag).toBe('IssueNotFound');
      expect(error.issueId).toBe(issueId);
    });

    test('tooManyChildren creates TooManyChildrenError', () => {
      const error = IssueError.tooManyChildren(5);
      expect(error._tag).toBe('TooManyChildren');
      expect(error.maxAllowed).toBe(5);
    });

    test('tooManyChildren uses default maxAllowed when not specified', () => {
      const error = IssueError.tooManyChildren();
      expect(error.maxAllowed).toBe(5);
    });

    test('notEnoughChildren creates NotEnoughChildrenError', () => {
      const error = IssueError.notEnoughChildren(2);
      expect(error._tag).toBe('NotEnoughChildren');
      expect(error.minRequired).toBe(2);
    });

    test('notEnoughChildren uses default minRequired when not specified', () => {
      const error = IssueError.notEnoughChildren();
      expect(error.minRequired).toBe(2);
    });

    test('notALeaf creates NotALeafError', () => {
      const issueId = makeIssueId('I123');
      const error = IssueError.notALeaf(issueId);
      expect(error._tag).toBe('NotALeaf');
      expect(error.issueId).toBe(issueId);
    });

    test('invalidTitles creates InvalidTitlesError', () => {
      const error = IssueError.invalidTitles('Duplicate titles');
      expect(error._tag).toBe('InvalidTitles');
      expect(error.reason).toBe('Duplicate titles');
    });
  });

  describe('IssueError Type Guards', () => {
    test('isEmptyTitle identifies EmptyTitleError', () => {
      const error = IssueError.emptyTitle();
      expect(IssueError.isEmptyTitle(error)).toBe(true);
      expect(IssueError.isTitleTooLong(error)).toBe(false);
    });

    test('isTitleTooLong identifies TitleTooLongError', () => {
      const error = IssueError.titleTooLong(100);
      expect(IssueError.isTitleTooLong(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });

    test('isRootAlreadyExists identifies RootAlreadyExistsError', () => {
      const error = IssueError.rootAlreadyExists();
      expect(IssueError.isRootAlreadyExists(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });

    test('isIssueNotFound identifies IssueNotFoundError', () => {
      const error = IssueError.issueNotFound(makeIssueId('I123'));
      expect(IssueError.isIssueNotFound(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });

    test('isTooManyChildren identifies TooManyChildrenError', () => {
      const error = IssueError.tooManyChildren();
      expect(IssueError.isTooManyChildren(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });

    test('isNotEnoughChildren identifies NotEnoughChildrenError', () => {
      const error = IssueError.notEnoughChildren();
      expect(IssueError.isNotEnoughChildren(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });

    test('isNotALeaf identifies NotALeafError', () => {
      const error = IssueError.notALeaf(makeIssueId('I123'));
      expect(IssueError.isNotALeaf(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });

    test('isInvalidTitles identifies InvalidTitlesError', () => {
      const error = IssueError.invalidTitles('Duplicate titles');
      expect(IssueError.isInvalidTitles(error)).toBe(true);
      expect(IssueError.isEmptyTitle(error)).toBe(false);
    });
  });

  describe('IssueError Message Conversion', () => {
    test('getMessage returns descriptive message for EmptyTitleError', () => {
      const error = IssueError.emptyTitle();
      expect(IssueError.getMessage(error)).toBe('タイトルを入力してください');
    });

    test('getMessage returns descriptive message for TitleTooLongError', () => {
      const error = IssueError.titleTooLong(100);
      expect(IssueError.getMessage(error)).toBe('タイトルは100文字以内で入力してください');
    });

    test('getMessage returns descriptive message for RootAlreadyExistsError', () => {
      const error = IssueError.rootAlreadyExists();
      expect(IssueError.getMessage(error)).toBe('ルート論点は既に存在します。複数のルート論点は追加できません。既存のルート論点を削除してから新しいルート論点を追加してください。');
    });

    test('getMessage returns descriptive message for IssueNotFoundError', () => {
      const issueId = makeIssueId('I123');
      const error = IssueError.issueNotFound(issueId);
      expect(IssueError.getMessage(error)).toBe('指定された論点(ID: I123)が見つかりません');
    });

    test('getMessage returns descriptive message for TooManyChildrenError', () => {
      const error = IssueError.tooManyChildren(5);
      expect(IssueError.getMessage(error)).toContain('ブレイクダウンが多すぎます');
      expect(IssueError.getMessage(error)).toContain('最大5件');
    });

    test('getMessage returns descriptive message for NotEnoughChildrenError', () => {
      const error = IssueError.notEnoughChildren(2);
      expect(IssueError.getMessage(error)).toContain('ブレイクダウンの数が不足');
      expect(IssueError.getMessage(error)).toContain('最小2件');
    });

    test('getMessage returns descriptive message for NotALeafError', () => {
      const issueId = makeIssueId('I123');
      const error = IssueError.notALeaf(issueId);
      expect(IssueError.getMessage(error)).toContain('指定された論点(ID: I123)は既に子論点を持っています');
    });

    test('getMessage returns descriptive message for InvalidTitlesError', () => {
      const error = IssueError.invalidTitles('Duplicate titles');
      expect(IssueError.getMessage(error)).toBe('無効なタイトルが含まれています: Duplicate titles');
    });
  });
});