// 論点ツリー操作のテスト実行

import { breakdownTool } from '../tool/breakdown.js';

async function main() {
  try {
    // テスト用パラメータ
    const testParams = {
      parentId: "I034",
      labels: [
        "人に起因する要因",
        "プロセスに起因する要因",
        "ツールに起因する要因",
        "プラクティスに起因する要因"
      ],
      dimension: "要因カテゴリー",
      breakdownType: "why",
      decomposeType: "OR"
    };
    
    // ブレイクダウンツールの実行
    console.log('実行開始: breakdownTool.execute()');
    const result = await breakdownTool.execute(testParams);
    console.log('実行完了');
    
    // 結果の出力
    console.log('レスポンス:', result);
  } catch (error) {
    console.error('エラー発生:', error);
  }
}

main().catch(console.error);