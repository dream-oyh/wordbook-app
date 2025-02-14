import { createSignal, onMount, Component, createEffect } from "solid-js";
import "./index.css";
import axios from "./api/axios";
import NotebookDetail from "./components/NotebookDetail";

interface Notebook {
  id: number;
  name: string;
  created_at: string;
}

// 词书选择器组件
const NotebookSelector: Component<{
  notebooks: Notebook[];
  currentId: number | null;
  onSelect: (id: number) => void;
}> = (props) => {
  return (
    <div class="relative notebook-select w-[600px]">
      <button
        class="w-full text-xl font-semibold bg-transparent text-white appearance-none cursor-pointer focus:outline-none flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          const select = e.currentTarget.nextElementSibling;
          select?.classList.toggle("hidden");
        }}
        style={{
          "background-image": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          "background-repeat": "no-repeat",
          "background-position": "right 1rem center",
          "background-size": "1.5em 1.5em",
          "padding-right": "3rem",
          "padding-left": "3rem",
        }}
      >
        <span class="flex-1 text-center">{props.notebooks.find((n) => n.id === props.currentId)?.name || "选择词书"}</span>
      </button>
      <div class="absolute left-0 mt-1 bg-white shadow-lg rounded-sm z-10 w-full hidden">
        <div class="py-1">
          {props.notebooks.map((notebook) => (
            <div
              class={`px-4 py-2 text-sm cursor-pointer text-center ${
                notebook.id === props.currentId ? "text-purple-600 bg-gray-50" : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={(e) => {
                const dropdown = e.currentTarget.parentElement?.parentElement;
                if (dropdown) {
                  dropdown.classList.add("hidden");
                  props.onSelect(notebook.id);
                }
              }}
            >
              {notebook.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 翻译平台选择器组件
const TranslatorSelector: Component<{
  current: string;
  onSelect: (translator: string) => void;
  show: boolean;
  onToggle: () => void;
}> = (props) => {
  return (
    <div class="relative translate-dropdown-container">
      <button
        class="text-xl font-semibold bg-transparent text-white appearance-none cursor-pointer focus:outline-none flex items-center"
        onClick={(e) => {
          e.stopPropagation();
          props.onToggle();
        }}
        style={{
          "background-image": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          "background-repeat": "no-repeat",
          "background-position": "right 0.5rem center",
          "background-size": "1.5em 1.5em",
          "padding-right": "2.5rem",
        }}
      >
        {props.current}
      </button>
      <div class={`absolute left-0 bg-white shadow-lg z-10 min-w-[120px] ${props.show ? "" : "hidden"}`}>
        <div class="flex flex-col">
          {["有道翻译", "必应词典"].map((translator) => (
            <div
              class={`px-4 py-2 text-sm ${translator === "必应词典" ? "" : "border-b border-gray-200"} cursor-pointer ${
                translator === props.current ? "text-purple-600 bg-gray-50" : "text-gray-700 hover:bg-gray-50"
              }`}
              onClick={() => props.onSelect(translator)}
            >
              {translator}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 自动调整高度的文本框组件
const AutoResizeTextarea: Component<{
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: KeyboardEvent) => void;
  placeholder: string;
  minHeight?: string;
  class?: string;
}> = (props) => {
  let textareaRef: HTMLTextAreaElement | undefined;

  const handleKeyPress = (e: KeyboardEvent) => {
    if (props.onKeyPress && e.key !== "Enter") {
      props.onKeyPress(e);
    }
  };

  const autoResize = () => {
    if (!textareaRef) return;
    // 先将高度设为 auto，以便正确计算 scrollHeight
    textareaRef.style.height = "auto";
    // 设置新的高度
    const minHeight = parseInt(props.minHeight || "128");
    const height = Math.max(minHeight, textareaRef.scrollHeight);
    textareaRef.style.height = `${height}px`;
  };

  // 监听值的变化
  createEffect(() => {
    props.value; // 依赖 value
    // 使用 setTimeout 确保内容已经渲染
    setTimeout(autoResize, 0);
  });

  return (
    <textarea
      ref={textareaRef}
      placeholder={props.placeholder}
      value={props.value}
      onInput={(e) => {
        props.onChange(e.currentTarget.value);
        autoResize();
      }}
      onKeyPress={handleKeyPress}
      class={`border border-gray-300 rounded py-2 px-4 bg-white text-gray-700 w-full ${props.class || ""}`}
      style={{ "min-height": props.minHeight || "128px" }}
    />
  );
};

const Main = () => {
  const [notebooks, setNotebooks] = createSignal<Notebook[]>([]);
  const [currentNotebookId, setCurrentNotebookId] = createSignal<number | null>(null);
  const [translationContent, setTranslationContent] = createSignal("");
  const [noteContent, setNoteContent] = createSignal("");
  const [searchWord, setSearchWord] = createSignal("");
  const [showNotebookInput, setShowNotebookInput] = createSignal(false);
  const [newNotebookName, setNewNotebookName] = createSignal("");
  const [showTranslateDropdown, setShowTranslateDropdown] = createSignal(false);
  const [currentTranslator, setCurrentTranslator] = createSignal("有道翻译");
  let searchInputRef: HTMLInputElement | undefined;

  // 添加一个状态来跟踪搜索框是否有焦点
  const [isSearchFocused, setIsSearchFocused] = createSignal(false);

  // 在 Main 组件中添加路由状态
  const [currentRoute, setCurrentRoute] = createSignal<string>("main");
  const [selectedNotebook, setSelectedNotebook] = createSignal<Notebook | null>(null);

  // 添加重命名状态
  const [editingNotebookId, setEditingNotebookId] = createSignal<number | null>(null);
  const [editingNotebookName, setEditingNotebookName] = createSignal("");

  const fetchNotebooks = async () => {
    try {
      const response = await axios.get("/api/notebooks");
      setNotebooks(response.data.notebooks);
      if (response.data.notebooks.length > 0) {
        setCurrentNotebookId(response.data.notebooks[0].id);
      }
    } catch (error) {
      console.error("获取词书列表失败：", error);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // 处理新建词书输入框
    if (target.closest(".create-notebook-btn")) {
      return;
    }
    if (!target.closest(".notebook-input-container") && showNotebookInput()) {
      setShowNotebookInput(false);
      setNewNotebookName("");
    }

    // 处理翻译下拉框
    if (!target.closest(".translate-dropdown-container") && showTranslateDropdown()) {
      setShowTranslateDropdown(false);
    }

    // 处理词书选择下拉框 - 点击外部时关闭
    if (!target.closest(".notebook-select")) {
      const dropdown = document.querySelector(".notebook-select > div:last-child");
      if (dropdown && !dropdown.classList.contains("hidden")) {
        dropdown.classList.add("hidden");
      }
    }
  };

  // 添加全局快捷键处理
  const handleGlobalKeyPress = async (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();

      // 先检查是否满足添加条件
      if (!currentNotebookId()) {
        alert("请先选择词书");
        return;
      }

      if (!searchWord()) {
        alert("请输入要添加的单词");
        return;
      }

      if (!translationContent()) {
        alert("请先搜索获取翻译");
        return;
      }

      // 如果所有条件都满足，直接执行添加操作
      console.log("Global shortcut: Ctrl+Enter");
      handleAddToNotebook(); // 直接添加到词书
    }
  };

  // 在 onMount 中添加全局事件监听
  onMount(() => {
    fetchNotebooks();
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleGlobalKeyPress);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleGlobalKeyPress);
    };
  });

  const handleCreateNotebook = async () => {
    if (!newNotebookName().trim()) {
      alert("请输入词书名称");
      return;
    }

    try {
      const response = await axios.post("/api/notebooks", {
        name: newNotebookName(),
      });
      console.log("创建词书成功：", response.data);
      await fetchNotebooks();
      setNewNotebookName("");
      setShowNotebookInput(false);
    } catch (error) {
      console.error("创建词书失败：", error);
    }
  };

  // 修改原有的 handleWordKeyPress 函数
  const handleWordKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        handleAddToNotebook();
      } else if (showNotebookInput()) {
        handleCreateNotebook();
      } else if (isSearchFocused()) {
        e.preventDefault();
        // 只有普通回车才触发搜索
        console.log("Executing search...");
        handleSearch();
      }
    }
  };

  const handleAddToNotebook = async () => {
    try {
      const wordData = {
        word: searchWord(),
        definition: translationContent().trim(),
        note: noteContent().trim(),
      };

      console.log("准备添加单词：", wordData);

      const response = await axios.post(`/api/notebooks/${currentNotebookId()}/words`, wordData);

      if (response.data.success) {
        console.log("添加到词书成功：", response.data);

        // 清空输入
        setSearchWord("");
        setTranslationContent("");
        setNoteContent("");

        alert("添加成功！");
        searchInputRef?.focus();
      } else {
        throw new Error("添加失败");
      }
    } catch (error: any) {
      console.error("添加到词书失败：", error);
      // 检查是否是重复添加的错误
      if (error.response?.data?.detail?.code === "WORD_EXISTS") {
        alert("该单词已在词书中");
      } else {
        alert("添加失败，请重试");
      }
    }
  };

  const handleTranslatorSelect = (translator: string) => {
    setCurrentTranslator(translator);
    setShowTranslateDropdown(false);
  };

  // 添加自动调整高度的函数
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    // 重置高度以便重新计算
    textarea.style.height = "128px"; // 设置为最小高度

    // 计算内容高度
    const scrollHeight = textarea.scrollHeight;

    // 如果内容高度大于最小高度，则扩展文本框
    if (scrollHeight > 128) {
      textarea.style.height = `${scrollHeight}px`;
    }
  };

  // 添加一个副作用来处理翻译内容变化时的高度调整
  const adjustTranslationHeight = () => {
    // 当翻译内容更新时，自动调整高度
    const textarea = document.querySelector('textarea[placeholder="翻译"]') as HTMLTextAreaElement;
    if (textarea) {
      autoResizeTextarea(textarea);
    }
  };

  // 在翻译内容更新后调用高度调整
  const updateTranslation = (content: string) => {
    setTranslationContent(content);
    // 使用 setTimeout 确保内容已经渲染
    setTimeout(adjustTranslationHeight, 0);
  };

  // 添加搜索处理函数
  const handleSearch = async () => {
    if (!searchWord()) {
      alert("请输入要搜索的单词");
      return;
    }

    try {
      // 1. 先查找单词是否存在于数据库
      const wordResponse = await axios.get(`/api/words/${searchWord()}`);

      // 2. 获取翻译
      const platform = currentTranslator() === "有道翻译" ? "youdao" : currentTranslator() === "必应词典" ? "bing" : "youdao";

      const translateResponse = await axios.get("/api/translate", {
        params: {
          word: searchWord(),
          platform,
        },
      });

      // 3. 更新翻译内容
      updateTranslation(translateResponse.data.translation);

      // 4. 如果单词已存在，填充笔记
      if (wordResponse.data.exists) {
        setNoteContent(wordResponse.data.note || "");
      } else {
        // 如果是新单词，清空笔记
        setNoteContent("");
      }
    } catch (error) {
      console.error("搜索失败：", error);
      alert("搜索失败，请重试");
    }
  };

  const handleDeleteNotebook = async (notebookId: number) => {
    try {
      await axios.delete(`/api/notebooks/${notebookId}`);
      await fetchNotebooks();
    } catch (error) {
      console.error("删除词书失败：", error);
      alert("删除失败，请重试");
    }
  };

  const handleCopyNotebook = async (notebookId: number) => {
    try {
      const response = await axios.post(`/api/notebooks/${notebookId}/copy`);
      if (response.data.success) {
        await fetchNotebooks();
      }
    } catch (error) {
      console.error("复制词书失败：", error);
      alert("复制失败，请重试");
    }
  };

  // 添加重命名处理函数
  const handleRenameNotebook = async (notebookId: number, newName: string) => {
    try {
      if (!newName.trim()) {
        alert("词书名称不能为空");
        return;
      }

      const response = await axios.put(`/api/notebooks/${notebookId}`, {
        name: newName.trim(),
      });

      if (response.data.success) {
        await fetchNotebooks();
        setEditingNotebookId(null);
        setEditingNotebookName("");
      }
    } catch (error) {
      console.error("重命名词书失败：", error);
      alert("重命名失败，请重试");
    }
  };

  return (
    <div class="container mx-auto p-4 flex-1">
      {currentRoute() === "main" ? (
        <div class="flex flex-col items-center">
          {/* Logo 和标题容器 */}
          <div class="flex items-center justify-center w-full mb-8 space-x-4">
            <img src="/logo.png" alt="wordbook logo" class="h-12 w-auto" />
            <span class="text-3xl font-bold text-white">WORDBOOK</span>
          </div>

          <div class="w-[600px]">
            <NotebookSelector notebooks={notebooks()} currentId={currentNotebookId()} onSelect={(id) => setCurrentNotebookId(id)} />
          </div>

          <div class="mt-8 w-[600px]">
            <div class="flex items-center space-x-2 mb-4">
              <TranslatorSelector
                current={currentTranslator()}
                onSelect={handleTranslatorSelect}
                show={showTranslateDropdown()}
                onToggle={() => setShowTranslateDropdown(!showTranslateDropdown())}
              />
              <input
                type="text"
                value={searchWord()}
                onInput={(e) => setSearchWord(e.currentTarget.value)}
                onKeyPress={handleWordKeyPress}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="搜索单词"
                class="flex-1 border border-gray-300 rounded-full py-2 px-4"
                ref={searchInputRef}
              />
              <div class="relative">
                <button class="bg-gray-200 hover:bg-gray-300 rounded-full p-2" onClick={handleSearch}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="flex flex-col space-x-4">
              <AutoResizeTextarea value={translationContent()} onChange={updateTranslation} placeholder="翻译" minHeight="8rem" />
            </div>
            <div class="flex flex-col space-x-4 mt-2">
              <AutoResizeTextarea value={noteContent()} onChange={setNoteContent} placeholder="笔记" minHeight="8rem" />
            </div>
          </div>

          <div class="mt-8 w-[600px]">
            <div class="flex space-x-4 mb-4 relative">
              <button
                class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded create-notebook-btn"
                onClick={() => setShowNotebookInput(true)}
              >
                新建词书
              </button>
              {showNotebookInput() && (
                <div class="absolute top-12 left-0 z-10 bg-white shadow-lg rounded-lg p-2 w-[400px] animate-fade-in notebook-input-container">
                  <div class="flex space-x-2">
                    <input
                      type="text"
                      value={newNotebookName()}
                      onInput={(e) => setNewNotebookName(e.currentTarget.value)}
                      onKeyPress={handleWordKeyPress}
                      placeholder="输入词书名称"
                      class="flex-1 border border-gray-300 rounded py-2 px-4 text-gray-900"
                      autofocus
                    />
                    <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={handleCreateNotebook}>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                      onClick={() => {
                        setShowNotebookInput(false);
                        setNewNotebookName("");
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <button
                class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
                onClick={handleAddToNotebook}
                title="快捷键：Ctrl + Enter"
              >
                <span>添加单词进词书</span>
                <span class="text-xs opacity-75">(Ctrl + ↵)</span>
              </button>
            </div>
            <div class="border border-gray-300 rounded">
              {notebooks().map((notebook) => (
                <div class="p-2 border-t first:border-t-0 border-gray-300 flex items-center justify-between">
                  {editingNotebookId() === notebook.id ? (
                    <input
                      type="text"
                      value={editingNotebookName()}
                      onInput={(e) => setEditingNotebookName(e.currentTarget.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleRenameNotebook(notebook.id, editingNotebookName());
                        } else if (e.key === "Escape") {
                          setEditingNotebookId(null);
                          setEditingNotebookName("");
                        }
                      }}
                      onBlur={() => {
                        setEditingNotebookId(null);
                        setEditingNotebookName("");
                      }}
                      class="flex-1 px-2 py-1 border border-gray-300 rounded text-gray-900"
                      autofocus
                    />
                  ) : (
                    <div
                      class="cursor-pointer hover:underline text-white flex-1"
                      onClick={() => {
                        setSelectedNotebook(notebook);
                        setCurrentRoute("notebook-detail");
                      }}
                    >
                      {notebook.name}
                    </div>
                  )}
                  <div class="flex space-x-2">
                    <button
                      class="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingNotebookId(notebook.id);
                        setEditingNotebookName(notebook.name);
                      }}
                      title="重命名"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      class="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要复制词书 "${notebook.name}" 吗？`)) {
                          handleCopyNotebook(notebook.id);
                        }
                      }}
                      title="创建副本"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                        />
                      </svg>
                    </button>
                    <button
                      class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定要删除词书 "${notebook.name}" 吗？这将删除词书中的所有单词。`)) {
                          handleDeleteNotebook(notebook.id);
                        }
                      }}
                      title="删除词书"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : currentRoute() === "notebook-detail" && selectedNotebook() ? (
        <NotebookDetail
          notebookId={selectedNotebook()!.id}
          notebookName={selectedNotebook()!.name}
          onBack={() => {
            setCurrentRoute("main");
            setSelectedNotebook(null);
          }}
        />
      ) : null}
    </div>
  );
};

export { Main };
