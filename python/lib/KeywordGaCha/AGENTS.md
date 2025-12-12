# KeywordGacha 开发速览（供 Codex 参考）

## 项目定位与运行
- 桌面端 Python/PyQt5 应用，入口 `app.py`，使用 qfluentwidgets 作为 UI 组件库。
- 默认启动 GUI：`python app.py`。CLI 模式：`python app.py --cli --input_folder ... --output_folder ... --source_language JA --target_language ZH`；CLI 只触发分析任务，结束后退出。
- 运行前需准备 `resource/config.json`（默认已存在）、`input` 与 `output` 目录，应用启动时会自动创建。

## 核心对象与事件流
- `base.Base` 定义全局事件枚举、任务/项目状态、基础日志/事件接口；`base.EventManager` 实现跨线程信号派发（PyQt `pyqtSignal`）。
- `module.Config` 以 dataclass 持久化用户配置（主题、语言、接口平台、输入输出路径、并发/限速、提示词开关等），读写默认路径 `./resource/config.json`，线程锁保证线程安全。
- `module.Engine.Engine` 管理全局任务状态，启动时实例化两个服务：
  - `module.Engine.NERAnalyzer.NERAnalyzer`：主体分析引擎。
  - `module.Engine.APITester.APITester`：接口连通性/限速测试（未在 UI 主流程中详述）。
- 事件驱动：UI/CLI 通过 `Base.Event.NER_ANALYZER_RUN` 等事件触发引擎；引擎进度用 `NER_ANALYZER_UPDATE`，完成用 `NER_ANALYZER_DONE`，请求停止用 `NER_ANALYZER_REQUIRE_STOP`，Toast 用 `TOAST`。

## 任务执行流程（NERAnalyzer）
1. **启动**：`NER_ANALYZER_RUN` 携带 `config`（可选）与 `status`（重新开始或继续）。若正在运行则弹 Toast。
2. **配置与准备**：
   - 读取配置；解析当前平台信息（模型、API URL、Key、采样参数、thinking 开关）。
   - 并发/限速：`TaskLimiter` 按 `max_workers`/`rpm_threshold` 控制提交速率（未设定时默认 8 并发）。
   - 重置缓存/提示词/伪名辅助：`CacheManager`, `PromptBuilder`, `FakeNameHelper`。
3. **输入加载**：
   - 若 `status` 为继续，则从 `output_folder/cache` 读取 `project.json` 与 `items.json`；否则清理旧 cache，使用 `module.File.FileManager.read_from_path` 扫描 `input_folder`。
   - 支持格式：`.md .txt .ass .srt .epub .xlsx（含多种来源） .rpy .trans .json`（MTool/SExtractor 等），并尝试识别文本类型（WOLF/REN’PY/RPGMaker）。
4. **预处理**：
   - 规则过滤（`module.Filter.RuleFilter`）与语言过滤（`LanguageFilter`）将不需要的条目标记为 `EXCLUDED`。
   - 生成任务分片：`CacheManager.generate_item_chunks` 按 token/行数阈值和文件边界切块，避免超长请求。
5. **请求与解析**：
   - 每个分片由 `NERAnalyzerTask` 构造 prompt（`PromptBuilder`），预处理文本（正则化、Ruby 去除、前置替换、伪名注入/还原），然后通过 `TaskRequester` 发起请求。
   - `TaskRequester` 支持 `OpenAI`/`Google`/`Anthropic`/`SakuraLLM` 兼容协议；根据平台参数设置 `top_p`、`temperature` 等；可轮换 API Key。thinking 回复与 result 分别处理。
   - 回复解析：`ResponseDecoder` 以 JSON 行解析，抽取字段 `src`/`dst`/`type` -> glossary。
6. **结果归并**：
   - `NERAnalyzer.task_done_callback` 汇总行数、token 消耗、耗时，更新项目状态为 `PROCESSING`，并请求定时保存缓存。
   - `NERAnalyzer.save_output` 对 glossary 去噪、简繁转换、伪名还原、按出现次数排序并输出多种格式：`output.xlsx`/`output.json`/`output_detail.txt`，可选 `output_kv.json`。
   - 结束或手动导出时写入输出；若启用自动打开输出目录则调用 `webbrowser.open`。
7. **停止/恢复**：
   - 停止时等待队列清空，保存缓存后置状态为 `IDLE` 并发送 `NER_ANALYZER_DONE`。
   - 继续任务通过读取 `cache` 目录恢复 `Project`/`Item` 状态。

## 数据模型与持久化
- `model.Item` 表示单条文本，属性含原文/译文、角色名、文件路径/类型、文本类型、状态、重试次数，内部用线程锁保护访问，提供 token 估算。
- `model.Project` 仅包含 `id`、`status`、`extras`（统计信息）；与 `Item` 一同由 `CacheManager` 序列化到 `output_folder/cache/items.json` 与 `project.json`。
- `CacheManager` 作为后台服务线程，按 15s 周期写入缓存；`require_save_to_file` 设置目标路径与标记，事件 `CACHE_SAVE` 用于 UI 提示。

## 前端结构（PyQt5 + qfluentwidgets）
- 主窗口 `frontend.AppFluentWindow` 负责导航、主题/语言切换、更新检查、Toast/消息框。
- 主要页面：
  - `frontend.TaskPage`：任务仪表盘与控制区（开始/停止/继续/导出/定时器），实时显示时间、行数、token、并发任务数、进度环；订阅多种事件更新 UI。
  - `frontend.Project.ProjectPage`：基础项目设置（原文/译文语言、输入/输出目录选择、完成后打开输出、繁体开关），直接读写 `Config`。
  - `frontend.Project.PlatformPage` 及子页：模型/平台管理（API URL、Key、模型名、采样参数、thinking 等）。
  - 质量/设置类页面：预处理替换、提示词定制、基础/专家设置等。
- UI 组件抽象在 `widget` 目录（卡片、表单、分隔线、搜索等），多数遵循“init 回调 -> 读 config”，“changed/ clicked 回调 -> 写 config”模式。

## 其他要点
- 日志：`base.LogManager` 同时写文件（`log/app.log` 日切分 3 份）与 Rich 控制台；“专家模式”启用更详细的调试输出。
- 国际化：`module.Localizer` 根据 `Config.app_language` 提供文案，新增 UI 文案需同时更新 ZH/EN 文件。
- 兼容/开关：`Config` 提供 `output_choices`、`output_kvjson`、`pre_replacement_enable`、`custom_prompt_*` 等开关，部分 UI 仅在专家模式或指定语言显示。
- 版本/更新：`base.VersionManager` 记录版本并处理更新事件（下载/解压逻辑在 `resource/pyinstaller.py` 附近）。

## 常见修改切入点
- 增加功能时，优先使用事件总线与现有页面的读写配置模式；不要直接跨线程操作 UI。
- 需要持久化的新数据：考虑放入 `Config`（全局设置）、`Project.extras`（任务运行期统计）、或新建独立 JSON 文件（避免破坏缓存格式）。
- 网络请求调整：集中在 `TaskRequester`（协议、重试、超时、Header），并受 `Config.request_timeout`、`max_workers`、`rpm_threshold` 影响。
- 文件格式扩展：在 `module/File` 目录新增 reader/writer，并在 `FileManager.read_from_path` 注册。
