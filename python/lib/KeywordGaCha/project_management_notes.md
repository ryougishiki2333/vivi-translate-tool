# 项目管理页面需求草案（TODO 与注意事项）

## 背景/现状
- 当前应用以“全局配置 + 单项目缓存”工作：`Config.input_folder`/`output_folder` 决定任务路径，`output/cache` 保存 `project.json`/`items.json` 以便继续任务。
- UI 只有“项目设置”页可选择输入/输出目录，没有项目列表或历史概念；任务记录仅存在于 cache 和输出文件，未形成可回溯的项目集。

## 目标功能
1) **项目添加**：页面上有按钮/操作可选择一个根目录，将其加入项目列表；若目录下缺少 `input`/`output` 子目录则自动创建。
2) **项目记录列表**：每次任务执行完毕生成一条记录，包含：
   - 关键词翻译状态：`已翻译`/`未翻译`（可据 `Project.status` 与缓存/输出存在性判定）。
   - 路径信息：项目根目录、`input`/`output` 子目录路径。
   - 运行概要：时间戳、行数/token 统计（可取 `Project.extras` 中的 `line`、`total_line`、`total_tokens`、`time` 等）。
   - 快捷操作：一键加载该项目（写入 `Config` 并触发 UI 刷新）、打开文件夹。

## 设计建议与TODO
- **数据模型/存储**
  - 定义 `ProjectRecord`（id、name/label、root_path、input_path、output_path、status、extras、updated_at）。
  - 存储位置建议：新建 `resource/projects.json`（同配置区），避免覆盖 cache；需线程锁/原子写。
  - 状态判定：`status` 可根据 `ProjectStatus.PROCESSED/PROCESSING/NONE`、输出文件存在 (`output/output.xlsx`) 以及 cache 状态决定。
  - 兼容性：保留现有单项目流程；未选项目时使用 `Config` 中的默认路径。

- **页面与交互**
  - 新增“项目管理”页，沿用 `qfluentwidgets` 卡片/列表样式；放在导航的项目组下（与 `ProjectPage` 同级）。
  - 列表项展示项目名、状态、更新时间、路径；提供按钮：`加载`（写 `Config.input_folder/output_folder` 并 emit 相关事件）、`打开目录`、`删除/从列表移除`。
  - “添加项目”按钮：选择根目录 -> 校验/创建子目录 -> 写入记录 -> 立即可加载。
  - 状态标签/按钮文本需走 `Localizer`，中英文文案同步。

- **与现有流程的桥接**
  - 加载项目时应调用 `Config().save()`，并在 UI 层触发 `PROJECT_CHECK_RUN` 以刷新 Task 页按钮状态。
  - 任务完成或停止后（`NER_ANALYZER_DONE`）写入/更新项目记录：填充 `extras` 里的统计值，更新状态为已处理/处理中止。
  - 若用户从列表加载后直接运行任务，`TaskPage` 现有逻辑无需改动，只需确保 `Config` 已被更新。
  - CLI 模式可暂不支持多项目，但存储格式应考虑未来扩展。

- **稳健性与边界**
  - 路径需使用绝对路径存储，避免工作目录变化导致失效；创建目录时处理权限/异常。
  - 需防重复添加：同一根目录（或同一 input/output 组合）应合并/更新而非重复插入。
  - 清理逻辑：删除记录时不删除实际文件夹，只移除元数据；若文件夹缺失，列表项应提示并提供修复/重新选择。
  - 线程：事件回调可能在后台线程触发，UI 更新需通过主线程信号。

- **测试要点**
  - 添加项目时自动创建子目录的行为（存在/不存在、无权限情况）。
  - 任务完成后记录写入与状态更新；继续任务后状态是否覆盖。
  - 加载项目后 Task 页“继续”按钮逻辑是否正确（依赖 `PROJECT_CHECK_RUN` 返回的状态）。
  - 国际化与主题切换下的 UI 显示。

## AI 实现注意
- 遵循现有模式：读配置用 `Config().load()`，写配置后记得 `save()`；跨线程消息统一用 `Base.emit`/`EventManager`。
- 不要直接操作全局单例的内部状态（如 `Engine`）来传递 UI 选择，保持事件驱动。
- 新增存储文件时保持 UTF-8 编码，无 BOM；读写均需异常捕获并写日志 `LogManager.get().error/debug`。
- 保持与现有缓存格式兼容，避免修改 `output/cache` 结构。
