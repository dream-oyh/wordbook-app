import { createSignal, onMount } from "solid-js";
import "./index.css";
import axios from "./api/axios";

interface Notebook {
  id: number;
  name: string;
  created_at: string;
}

const Main = () => {
  const [notebooks, setNotebooks] = createSignal<Notebook[]>([]);
  const [currentNotebookId, setCurrentNotebookId] = createSignal<number | null>(null);
  const [translationContent, setTranslationContent] = createSignal("");
  const [noteContent, setNoteContent] = createSignal("");

  const fetchNotebooks = async () => {
    try {
      const response = await axios.get("/api/notebooks");
      setNotebooks(response.data.notebooks);
      if (response.data.notebooks.length > 0) {
        setCurrentNotebookId(response.data.notebooks[0].id);
      }
    } catch (error) {
      console.error("获取词本列表失败：", error);
    }
  };

  onMount(() => {
    fetchNotebooks();
  });

  const handleCreateNotebook = async () => {
    try {
      const response = await axios.post("/api/notebooks", {
        name: `词本 ${notebooks().length + 1}`,
      });
      console.log("创建词本成功：", response.data);
      await fetchNotebooks();
    } catch (error) {
      console.error("创建词本失败：", error);
    }
  };

  const handleAddToNotebook = async () => {
    if (!currentNotebookId()) {
      alert("请先选择词本");
      return;
    }

    if (!translationContent()) {
      alert("请输入要添加的单词");
      return;
    }

    try {
      const response = await axios.post(`/api/notebooks/${currentNotebookId()}/words`, {
        word: translationContent(),
        definition: "",
        note: noteContent(),
      });

      console.log("添加到词本成功：", response.data);
      setTranslationContent("");
      setNoteContent("");
      alert("添加成功！");
    } catch (error) {
      console.error("添加到词本失败：", error);
      alert("添加失败，请重试");
    }
  };

  return (
    <div class="container mx-auto p-4 flex-1">
      <div class="flex flex-col items-center">
        <select
          class="text-3xl font-bold mb-4 bg-transparent border-none"
          value={currentNotebookId() || ""}
          onChange={(e) => setCurrentNotebookId(Number(e.target.value))}
        >
          {/* eslint-disable-next-line jsx-key */}
          {notebooks().map((notebook) => (
            <option value={notebook.id}>{notebook.name}</option>
          ))}
        </select>

        <div class="mt-8 w-full max-w-md">
          <div class="flex items-center space-x-2 mb-4">
            <div class="relative">
              <button
                class="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
                onClick={() => document.getElementById("translate-dropdown")?.classList.toggle("hidden")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div id="translate-dropdown" class="hidden absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-lg z-10">
                <div class="py-1">
                  <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">有道翻译</button>
                  <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">谷歌翻译</button>
                  <button class="block w-full text-left px-4 py-2 hover:bg-gray-100">剑桥词典</button>
                </div>
              </div>
            </div>
            <input type="text" placeholder="搜索单词" class="flex-1 border border-gray-300 rounded-full py-2 px-4" />
            <div class="relative">
              <button
                class="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
                onClick={() => document.getElementById("search-dropdown")?.classList.toggle("hidden")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex flex-col space-x-4">
            <input
              type="text"
              placeholder="翻译"
              readonly
              value={translationContent()}
              class="border border-gray-300 rounded py-2 px-4 bg-gray-100 text-gray-700 font-bold"
            />
          </div>
          <div class="flex flex-col space-x-4">
            <input
              type="text"
              value={noteContent()}
              onInput={(e) => setNoteContent(e.target.value)}
              placeholder="笔记"
              class="border border-gray-300 rounded py-2 px-4 bg-white text-gray-700"
            />
          </div>
        </div>

        <div class="mt-8 w-full max-w-md">
          <div class="flex space-x-4 mb-4">
            <button class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" onClick={handleCreateNotebook}>
              新建词本
            </button>
            <button class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded" onClick={handleAddToNotebook}>
              添加单词进词本
            </button>
          </div>
          <div class="border border-gray-300 rounded">
            {/* eslint-disable-next-line jsx-key */}
            {notebooks().map((notebook) => (
              <div class="p-2 border-t first:border-t-0 border-gray-300">{notebook.name}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Main };
