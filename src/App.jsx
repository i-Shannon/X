import React, { useState, useEffect } from 'react';
import { Button, Spin, message, Divider, Card, Space } from 'antd';
import FormulaEditor from './components/FormulaEditor';

const App = () => {
  const [fields, setFields] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedFormula, setSavedFormula] = useState('');

  // 初始加载时获取字段数据
  useEffect(() => {
    fetchFieldData();
  }, []);

  // 模拟从服务器获取字段数据
  const fetchFieldData = async () => {
    setIsLoading(true);
    try {
      // 模拟API请求延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟服务器返回的数据
      const mockFieldData = [
        { displayName: '文章名', sourceName: 'title', type: '文本' },
        { displayName: '作者', sourceName: 'author', type: '文本' },
        { displayName: '售价', sourceName: 'price', type: '数字' },
        { displayName: '版本号', sourceName: 'version', type: '数字' },
        {
          displayName: '人员对象',
          sourceName: 'person',
          type: 'object',
          fields: [
            { displayName: 'ID', sourceName: 'id', type: '数字' },
            { displayName: '姓名', sourceName: 'name', type: '文本' },
            { displayName: '数量', sourceName: 'count', type: '数字' },
          ],
        },
      ];

      setFields(mockFieldData);
      setIsLoading(false);
    } catch (error) {
      console.error('加载字段数据失败:', error);
      message.error('无法加载字段数据，请重试');
      setIsLoading(false);
    }
  };

  // 处理公式保存
  const handleSaveFormula = (formula) => {
    console.log('保存的公式:', formula);
    setSavedFormula(formula);
    message.success('公式已保存');
  };

  // 重新加载字段数据
  const handleRefreshFields = () => {
    fetchFieldData();
    message.info('正在重新加载字段数据...');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">公式编辑器</h1>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <Button
            type="primary"
            onClick={handleRefreshFields}
            loading={isLoading}
          >
            重新加载字段数据
          </Button>
          <span className="ml-3 text-gray-500">
            {isLoading ? '加载中...' : `已加载 ${fields.length} 个字段`}
          </span>
        </div>

        {savedFormula && (
          <div className="flex items-center">
            <span className="mr-2 text-gray-700 font-medium">当前公式:</span>
            <code className="bg-gray-100 px-3 py-1 rounded text-indigo-600 font-mono">
              {savedFormula}
            </code>
          </div>
        )}
      </div>

      <Card
        className="shadow-md"
        bodyStyle={{ padding: 0 }}
      >
        <FormulaEditor
          fields={fields}
          isLoading={isLoading}
          initialFormula={{
            display: 'ADD(1, 人员对象.ID)',
            source: 'ADD(1, person.id)',
          }}
          onSave={handleSaveFormula}
          onCancel={() => {}}
        />
      </Card>

      {savedFormula && (
        <div className="mt-6">
          <Divider orientation="left">公式测试与预览</Divider>
          <Card
            title="已保存的公式"
            className="bg-gray-50"
          >
            <div className="font-mono bg-white p-3 rounded-md border border-gray-300">
              {savedFormula}
            </div>
            <div className="mt-4">
              <p className="text-gray-600">这里可以添加公式的测试结果、应用场景说明等信息。</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default App;
