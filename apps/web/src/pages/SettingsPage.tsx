interface Props {
  user: { id: string } | null;
}

export function SettingsPage(_props: Props) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">设置与教程</h1>
      <section className="bg-white border rounded-xl p-6 grid gap-4">
        <h2 className="font-semibold">书源获取三步走</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-700">
          <li><strong>书源商店</strong>：侧边栏进入，一键导入演示书源（推荐新手）</li>
          <li><strong>生成书源向导</strong>：输入小说站网址，分步自动分析规则</li>
          <li><strong>社区导入</strong>：在「我的书源」粘贴 JSON 或订阅链接</li>
        </ol>
        <h3 className="font-semibold mt-4">常见书源渠道</h3>
        <ul className="list-disc list-inside text-slate-600 space-y-1">
          <li>GitHub 搜索「legado 书源」</li>
          <li>阅读 (Legado) 开源社区分享</li>
          <li>从阅读 App 导出书源 JSON</li>
        </ul>
      </section>
    </div>
  );
}
