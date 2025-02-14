import { Component, createSignal, onMount } from "solid-js";
import axios from "../api/axios";

interface Word {
  word: string;
  definition: string;
  note: string;
  add_time: string;
}

const NotebookDetail: Component<{
  notebookId: number;
  notebookName: string;
  onBack: () => void;
}> = (props) => {
  const [words, setWords] = createSignal<Word[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [isSelectionMode, setIsSelectionMode] = createSignal(false);
  const [selectedWords, setSelectedWords] = createSignal<Set<string>>(new Set<string>());
  const [notebooks, setNotebooks] = createSignal<Array<{ id: number; name: string }>>([]);
  const [showNotebookSelect, setShowNotebookSelect] = createSignal<false | "move" | "copy">(false);

  const fetchWords = async () => {
    try {
      const response = await axios.get(`/api/notebooks/${props.notebookId}/words`);
      setWords(response.data.words);
    } catch (error) {
      console.error("获取单词列表失败：", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotebooks = async () => {
    try {
      const response = await axios.get("/api/notebooks");
      setNotebooks(response.data.notebooks.filter((n: any) => n.id !== props.notebookId));
    } catch (error) {
      console.error("获取词书列表失败：", error);
    }
  };

  const toggleWordSelection = (word: string) => {
    const newSelection = new Set(selectedWords());
    if (newSelection.has(word)) {
      newSelection.delete(word);
    } else {
      newSelection.add(word);
    }
    setSelectedWords(newSelection);
  };

  const handleBatchDelete = async () => {
    if (!selectedWords().size) {
      alert("请先选择要删除的单词");
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedWords().size} 个单词吗？`)) {
      return;
    }

    try {
      const promises = Array.from(selectedWords()).map((word) => axios.delete(`/api/notebooks/${props.notebookId}/words/${encodeURIComponent(word)}`));
      await Promise.all(promises);
      alert("删除成功！");
      setIsSelectionMode(false);
      setSelectedWords(new Set<string>());
      await fetchWords();
    } catch (error) {
      console.error("批量删除失败：", error);
      alert("删除失败，请重试");
    }
  };

  const handleBatchMove = async (targetNotebookId: number) => {
    if (!selectedWords().size) {
      alert("请先选择要移动的单词");
      return;
    }

    try {
      const promises = Array.from(selectedWords()).map((word) =>
        axios.post(`/api/notebooks/${targetNotebookId}/words/move`, {
          sourceNotebookId: props.notebookId,
          word,
        }),
      );
      await Promise.all(promises);
      alert("移动成功！");
      setIsSelectionMode(false);
      setSelectedWords(new Set<string>());
      setShowNotebookSelect(false);
      await fetchWords();
    } catch (error) {
      console.error("批量移动失败：", error);
      alert("移动失败，请重试");
    }
  };

  const handleBatchCopy = async (targetNotebookId: number) => {
    if (!selectedWords().size) {
      alert("请先选择要复制的单词");
      return;
    }

    try {
      const promises = Array.from(selectedWords()).map((word) =>
        axios.post(`/api/notebooks/${targetNotebookId}/words/copy`, {
          sourceNotebookId: props.notebookId,
          word,
        }),
      );
      await Promise.all(promises);
      alert("复制成功！");
      setIsSelectionMode(false);
      setSelectedWords(new Set<string>());
      setShowNotebookSelect(false);
    } catch (error) {
      console.error("批量复制失败：", error);
      alert("复制失败，请重试");
    }
  };

  // 添加点击外部关闭的处理函数
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".notebook-select-dropdown") && !target.closest(".notebook-select-button")) {
      setShowNotebookSelect(false);
    }
  };

  onMount(() => {
    fetchWords();
    fetchNotebooks();
    // 添加点击事件监听
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });

  return (
    <div class="container mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">{props.notebookName}</h1>
        <div class="flex space-x-4">
          {isSelectionMode() ? (
            <>
              <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={handleBatchDelete}>
                删除选中
              </button>
              <div class="relative">
                <button
                  class="notebook-select-button bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotebookSelect(showNotebookSelect() === "move" ? false : "move");
                  }}
                >
                  移动到
                </button>
                {showNotebookSelect() === "move" && (
                  <div class="notebook-select-dropdown absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10">
                    <div class="py-2">
                      <div class="px-4 py-2 text-sm font-medium text-gray-700 text-black">选择目标词书：</div>
                      {notebooks().map((notebook) => (
                        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-black" onClick={() => handleBatchMove(notebook.id)}>
                          {notebook.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div class="relative">
                <button
                  class="notebook-select-button bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotebookSelect(showNotebookSelect() === "copy" ? false : "copy");
                  }}
                >
                  复制到
                </button>
                {showNotebookSelect() === "copy" && (
                  <div class="notebook-select-dropdown absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10">
                    <div class="py-2">
                      <div class="px-4 py-2 text-sm font-medium text-gray-700 text-black">选择目标词书：</div>
                      {notebooks().map((notebook) => (
                        <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-black" onClick={() => handleBatchCopy(notebook.id)}>
                          {notebook.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedWords(new Set<string>());
                  setShowNotebookSelect(false);
                }}
              >
                取消
              </button>
            </>
          ) : (
            <>
              <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => setIsSelectionMode(true)}>
                批量操作
              </button>
              <button class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" onClick={props.onBack}>
                返回
              </button>
            </>
          )}
        </div>
      </div>

      {loading() ? (
        <div class="text-center text-white">加载中...</div>
      ) : (
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                {isSelectionMode() && <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">选择</th>}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单词</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">释义</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">笔记</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">添加时间</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {words().map((word) => (
                <tr class="hover:bg-gray-50 cursor-pointer" onClick={() => isSelectionMode() && toggleWordSelection(word.word)}>
                  {isSelectionMode() && (
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedWords().has(word.word)}
                          onChange={(e) => {
                            e.stopPropagation(); // 防止触发行点击事件
                            toggleWordSelection(word.word);
                          }}
                          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </td>
                  )}
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{word.word}</td>
                  <td class="px-6 py-4 text-sm text-gray-500 whitespace-pre-wrap">{word.definition}</td>
                  <td class="px-6 py-4 text-sm text-gray-500 whitespace-pre-wrap">{word.note}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(word.add_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NotebookDetail;
