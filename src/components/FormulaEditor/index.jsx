// 修改后支持与 Ant Design Form 集成的公式编辑器组件
import React, { useState, useRef, useEffect } from 'react';
import {
  Input,
  Button,
  Switch,
  Card,
  Modal,
  Typography,
  Tag,
  Space,
  Tooltip,
  List,
  Empty,
  message,
  Alert,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CaretDownOutlined,
  FileTextOutlined,
  FunctionOutlined,
  CodeOutlined,
  PlusOutlined,
  ExperimentOutlined,
  LoadingOutlined,
  CalculatorOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

// 导入常量
import {
  PANEL_HEIGHT,
  DEFAULT_FUNCTION_CATEGORIES,
  FIELD_TYPE_CONFIG,
  DEFAULT_FORMULA,
  DEFAULT_TEST_DATA,
  TYPE_MAP,
} from './constants';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 函数配置系统 - 允许动态添加函数
const createFunctionConfig = (initialCategories = []) => {
  let functionCategories = [...initialCategories];

  // 添加新函数类别的方法
  const addCategory = (category) => {
    functionCategories.push(category);
  };

  // 向已有类别添加函数的方法
  const addFunction = (categoryName, functionDef) => {
    const category = functionCategories.find((cat) => cat.name === categoryName);
    if (category) {
      category.functions.push(functionDef);
    } else {
      // 如果类别不存在则创建新类别
      addCategory({
        name: categoryName,
        functions: [functionDef],
      });
    }
  };

  // 获取所有函数类别的方法
  const getCategories = () => {
    return functionCategories;
  };

  // 获取所有函数的扁平列表
  const getAllFunctions = () => {
    return functionCategories.flatMap((category) => category.functions);
  };

  // 通过名称获取函数
  const getFunction = (functionName) => {
    return getAllFunctions().find((func) => func.name === functionName);
  };

  return {
    addCategory,
    addFunction,
    getCategories,
    getAllFunctions,
    getFunction,
  };
};

// 类型标签组件，用于一致地渲染类型指示器
const TypeBadge = ({ type }) => {
  const typeConfig = FIELD_TYPE_CONFIG[type] || { color: 'default', label: type };

  return (
    <Tag
      color={typeConfig.color}
      className="rounded-sm px-1.5 py-0 text-xs font-medium"
    >
      {typeConfig.label}
    </Tag>
  );
};

// 改进的高亮公式输入组件 - 直接在输入框内实现高亮且修复光标问题
const HighlightedFormulaInput = React.forwardRef(
  ({ value, onChange, onSelect, highlightPattern, functionNames, isSourceMode }, ref) => {
    const inputRef = useRef(null);
    const [hasFocus, setHasFocus] = useState(false);
    const [lastCursorPosition, setLastCursorPosition] = useState(null);
    const lastValueRef = useRef('');

    // 获取当前光标位置和选择范围
    const getCaretPosition = () => {
      if (!inputRef.current) return { start: 0, end: 0 };

      const selection = window.getSelection();
      if (!selection.rangeCount) return { start: 0, end: 0 };

      const range = selection.getRangeAt(0);
      let position = 0;
      let startPosition = 0;
      let endPosition = 0;
      let foundStart = false;

      // 遍历所有文本节点计算位置
      const countPosition = (node, isEnd = false) => {
        if (node === range.startContainer) {
          startPosition = position + range.startOffset;
          foundStart = true;
        }

        if (node === range.endContainer) {
          endPosition = position + range.endOffset;
          return true;
        }

        // 如果是文本节点，累加长度
        if (node.nodeType === Node.TEXT_NODE) {
          position += node.length;
        }
        // 如果是元素节点，遍历其子节点
        else if (node.nodeType === Node.ELEMENT_NODE) {
          for (let i = 0; i < node.childNodes.length; i++) {
            if (countPosition(node.childNodes[i], isEnd)) {
              return true;
            }
          }
        }

        return false;
      };

      // 从编辑器的容器开始遍历
      countPosition(inputRef.current);

      return {
        start: startPosition,
        end: endPosition || startPosition,
      };
    };

    // 设置光标位置
    const setCaretPosition = (start, end = start) => {
      if (!inputRef.current) return;

      // 确保编辑器有焦点
      if (document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }

      const selection = window.getSelection();
      const range = document.createRange();

      // 找到对应的文本节点和偏移量
      let currentPosition = 0;
      let startNode = null;
      let startOffset = 0;
      let endNode = null;
      let endOffset = 0;

      // 递归查找正确的节点和偏移量
      const findPosition = (node) => {
        // 对于文本节点，检查位置是否在范围内
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeLength = node.length;

          // 找起始位置
          if (!startNode && currentPosition + nodeLength >= start) {
            startNode = node;
            startOffset = start - currentPosition;
          }

          // 找结束位置
          if (!endNode && currentPosition + nodeLength >= end) {
            endNode = node;
            endOffset = end - currentPosition;
            return true;
          }

          currentPosition += nodeLength;
        }
        // 对于元素节点，递归遍历子节点
        else if (node.nodeType === Node.ELEMENT_NODE) {
          for (let i = 0; i < node.childNodes.length; i++) {
            // 如果找到结束位置，停止遍历
            if (findPosition(node.childNodes[i])) {
              return true;
            }
          }
        }

        return false;
      };

      // 从编辑器容器开始遍历
      findPosition(inputRef.current);

      // 如果找到合适的节点，设置光标
      if (startNode && endNode) {
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    };

    // 提取纯文本内容（删除所有HTML标签）
    const getPlainText = (html) => {
      if (!html) return '';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    };

    // 生成高亮HTML
    const getHighlightedHTML = (text) => {
      if (!text) return '';

      let lastIndex = 0;
      const segments = [];
      const functionPattern = new RegExp(`\\b(${functionNames.join('|')})\\b(?=\\s*\\()`, 'g');

      // 匹配函数
      const funcMatches = Array.from(text.matchAll(functionPattern));
      let allMatches = [...funcMatches];

      // 如果提供了字段模式，添加字段匹配
      if (highlightPattern) {
        const fieldMatches = Array.from(text.matchAll(highlightPattern));
        allMatches = [...allMatches, ...fieldMatches];
      }

      // 按索引排序匹配项
      allMatches.sort((a, b) => a.index - b.index);

      if (allMatches.length === 0) {
        return text;
      }

      allMatches.forEach((match) => {
        if (match.index > lastIndex) {
          segments.push(text.substring(lastIndex, match.index));
        }

        // 检查是否是函数匹配
        const isFunction = functionNames.includes(match[0]);
        const className = isFunction
          ? 'bg-indigo-100 text-indigo-800 px-1 rounded'
          : 'bg-blue-100 text-blue-800 px-1 rounded';

        segments.push(`<span class="${className}">${match[0]}</span>`);
        lastIndex = match.index + match[0].length;
      });

      if (lastIndex < text.length) {
        segments.push(text.substring(lastIndex));
      }

      return segments.join('');
    };

    // 处理键盘事件
    const handleKeyDown = (e) => {
      // 允许正常输入，但捕获特殊按键
      if (e.key === 'Enter') {
        e.preventDefault();
      }

      // 保存当前光标位置，用于后续恢复
      setLastCursorPosition(getCaretPosition());
    };

    // 处理输入事件
    const handleInput = (e) => {
      // 保存当前光标位置
      const currentPosition = getCaretPosition();
      setLastCursorPosition(currentPosition);

      // 提取纯文本并发送给父组件
      const plainText = inputRef.current.innerText;
      lastValueRef.current = plainText; // 保存当前值用于比较

      onChange({ target: { value: plainText } });
    };

    // 处理粘贴事件
    const handlePaste = (e) => {
      e.preventDefault();
      // 获取粘贴的文本并作为纯文本插入
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);

      // 提取更新后的内容并通知父组件
      const updatedText = inputRef.current.innerText;
      onChange({ target: { value: updatedText } });
    };

    const handleFocus = () => {
      setHasFocus(true);
    };

    const handleBlur = () => {
      setHasFocus(false);
    };

    // 处理选择变化
    const handleSelect = (e) => {
      const selection = getCaretPosition();
      setLastCursorPosition(selection);

      // 更新父组件中的光标位置
      if (onSelect) {
        onSelect({
          target: {
            selectionStart: selection.start,
            selectionEnd: selection.end,
          },
        });
      }
    };

    // 当value变化时更新高亮内容
    useEffect(() => {
      if (!inputRef.current) return;

      // 提取内容中的纯文本
      const currentText = getPlainText(inputRef.current.innerHTML);

      // 只有当纯文本内容与value不匹配时更新
      if (currentText !== value) {
        // 保存光标位置
        const currentPosition = lastCursorPosition || { start: value.length, end: value.length };

        // 更新高亮内容
        inputRef.current.innerHTML = getHighlightedHTML(value);

        // 恢复光标位置
        if (document.activeElement === inputRef.current) {
          try {
            // 考虑到文本长度变化，调整光标位置
            const maxPos = getPlainText(inputRef.current.innerHTML).length;
            const adjustedStart = Math.min(currentPosition.start, maxPos);
            const adjustedEnd = Math.min(currentPosition.end, maxPos);

            // 设置光标位置
            setTimeout(() => {
              setCaretPosition(adjustedStart, adjustedEnd);
            }, 0);
          } catch (e) {
            console.error('恢复光标位置时出错', e);
          }
        }
      }
    }, [value, functionNames, highlightPattern]);

    // 暴露方法给父组件
    React.useImperativeHandle(ref, () => ({
      // 设置光标位置方法，供父组件调用
      setCaretPosition,
      focus: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
    }));

    return (
      <div
        className={`relative border rounded-md shadow-sm min-h-[38px] ${
          hasFocus ? 'border-blue-300 ring-1 ring-blue-500' : 'border-gray-300'
        }`}
      >
        <div
          ref={inputRef}
          contentEditable="true"
          className="block w-full py-2 px-3 text-base font-mono 
          focus:outline-none resize-none break-words"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSelect={handleSelect}
          onPaste={handlePaste}
          spellCheck="false"
        />
      </div>
    );
  },
);

// 错误弹窗内容 - 支持显示更多类型的错误
const ErrorPopoverContent = ({ errors }) => {
  // 辅助函数 - 根据错误类型获取图标
  const getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'function':
        return <FunctionOutlined className="text-red-500 mr-2 mt-1 flex-shrink-0" />;
      case 'variable':
        return <FileTextOutlined className="text-red-500 mr-2 mt-1 flex-shrink-0" />;
      case 'bracket':
        return <BranchesOutlined className="text-red-500 mr-2 mt-1 flex-shrink-0" />;
      case 'type':
      case 'returnType':
        return <ExclamationCircleOutlined className="text-red-500 mr-2 mt-1 flex-shrink-0" />;
      default:
        return <WarningOutlined className="text-red-500 mr-2 mt-1 flex-shrink-0" />;
    }
  };

  // 辅助函数 - 根据错误类型获取标题
  const getErrorTitle = (error) => {
    switch (error.type) {
      case 'function':
        return `函数错误: ${error.name}`;
      case 'variable':
        return `变量错误: ${error.variable}`;
      case 'bracket':
        return `括号错误: 位置 ${error.position + 1}`;
      case 'type':
        return `类型错误: ${error.variable || `参数 ${error.paramIndex + 1}`}`;
      case 'returnType':
        return `返回类型错误: ${error.function}`;
      case 'syntax':
        return '语法错误';
      default:
        return '验证错误';
    }
  };

  return (
    <div className="max-w-lg max-h-80 overflow-y-auto">
      <div className="font-medium text-red-600 mb-2 flex items-center">
        <AlertOutlined className="mr-1.5" />
        发现以下错误：
      </div>
      <List
        size="small"
        dataSource={errors}
        renderItem={(error, index) => (
          <List.Item className="py-1.5 border-b border-red-100">
            <div className="flex items-start">
              {getErrorIcon(error.type)}
              <div>
                <div className="font-medium">{getErrorTitle(error)}</div>
                <div className="text-xs text-gray-600 mt-1">{error.message}</div>

                {/* 显示类型错误的附加信息 */}
                {(error.type === 'type' || error.type === 'returnType') &&
                  error.expectedType &&
                  error.actualType && (
                    <div className="mt-1.5 text-xs">
                      <Tag color="blue">期望: {error.expectedType}</Tag>
                      <Tag color="orange">实际: {error.actualType}</Tag>
                    </div>
                  )}
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

// 改进后的测试模态窗口组件 - 自动执行测试
const TestModal = ({
  visible,
  onCancel,
  onTest,
  formula,
  testDataInput,
  onTestDataChange,
  onGenerateTestData,
  testResult,
  testError,
  validationErrors,
}) => {
  // 判断公式是否有错误
  const hasErrors = validationErrors && validationErrors.length > 0;

  // 组件挂载或更新时自动测试
  useEffect(() => {
    if (visible && !hasErrors && testDataInput) {
      // 当模态窗口可见时自动运行测试
      onTest();
    }
  }, [visible, testDataInput, hasErrors]);

  return (
    <Modal
      title={
        <div className="flex items-center">
          <ExperimentOutlined className="text-indigo-500 mr-2" />
          <span>公式测试</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button
          key="cancel"
          onClick={onCancel}
        >
          关闭
        </Button>,
        <Button
          key="test"
          type="primary"
          onClick={onTest}
          disabled={hasErrors}
          className={`${hasErrors ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          重新测试
        </Button>,
      ]}
      width={600}
    >
      <div className="mb-4">
        <div className="font-medium mb-2">当前公式:</div>
        <div className="bg-gray-50 p-2 rounded-md border border-gray-300 font-mono">{formula}</div>
      </div>

      {/* 如果公式有错误，显示警告 */}
      {hasErrors && (
        <Alert
          type="warning"
          message="公式包含错误"
          description="请先修正公式中的错误，然后再进行测试。"
          showIcon
          className="mb-4"
        />
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium">测试数据 (JSON格式):</div>
          {/* 添加生成测试数据按钮 */}
          <Button
            onClick={onGenerateTestData}
            size="small"
            icon={<PlusOutlined />}
            type="primary"
            className="bg-green-600 hover:bg-green-700"
          >
            生成测试数据
          </Button>
        </div>
        <TextArea
          value={testDataInput}
          onChange={onTestDataChange}
          className="w-full font-mono text-sm"
          rows={6}
          placeholder='例如: { "person": { "id": 123 } }'
        />
      </div>

      {testResult !== null && (
        <div className="animate-fadeIn">
          <div className="font-medium text-green-800 mb-2 flex items-center">
            <CheckCircleOutlined className="mr-1.5 text-green-600" />
            计算结果:
          </div>
          <div className="font-mono bg-white p-2.5 rounded-md border border-green-200 shadow-inner">
            {typeof testResult === 'object'
              ? JSON.stringify(testResult, null, 2)
              : testResult.toString()}
          </div>
        </div>
      )}

      {testError && (
        <Alert
          type="error"
          message="计算出错"
          description={testError}
          showIcon
        />
      )}
    </Modal>
  );
};

// 字段加载状态组件
const FieldsLoadingState = () => (
  <div className="flex flex-col items-center justify-center h-full py-10">
    <Spin
      indicator={
        <LoadingOutlined
          style={{ fontSize: 24 }}
          spin
        />
      }
      className="mb-4"
    />
    <div className="text-gray-500">加载字段数据中...</div>
  </div>
);

/**
 * 公式编辑器组件 - 修改为支持Form组件集成
 * @param {Object} props 组件属性
 * @param {Array} props.fields 表单字段数组
 * @param {boolean} props.isLoading 是否正在加载字段数据
 * @param {Object} props.value 当前公式对象 (由Form提供)
 * @param {Function} props.onChange 公式变化的回调函数 (由Form调用)
 * @param {Function} props.onCancel 取消编辑的回调函数（可选）
 * @returns {JSX.Element} 公式编辑器组件
 */
const FormulaEditor = ({
  fields = [],
  isLoading = false,
  value = DEFAULT_FORMULA,
  onChange,
  onCancel,
}) => {
  // 初始化配置系统 - 使用常量中定义的默认值
  const functionConfig = createFunctionConfig(DEFAULT_FUNCTION_CATEGORIES);

  // 状态管理
  const [displayFormula, setDisplayFormula] = useState(value.display || DEFAULT_FORMULA.display);
  const [sourceFormula, setSourceFormula] = useState(value.source || DEFAULT_FORMULA.source);
  const [cursorPosition, setCursorPosition] = useState(
    (value.display || DEFAULT_FORMULA.display).length,
  );
  const [searchFieldTerm, setSearchFieldTerm] = useState('');
  const [searchFuncTerm, setSearchFuncTerm] = useState('');
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [hoveredFunction, setHoveredFunction] = useState(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [testDataInput, setTestDataInput] = useState(DEFAULT_TEST_DATA);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [expandedCategories, setExpandedCategories] = useState({});

  // 引用
  const inputRef = useRef(null);

  // 同步外部value变化
  useEffect(() => {
    if (value && (value.display !== displayFormula || value.source !== sourceFormula)) {
      setDisplayFormula(value.display || DEFAULT_FORMULA.display);
      setSourceFormula(value.source || DEFAULT_FORMULA.source);
      validateFormula(isSourceMode ? value.source : value.display);
    }
  }, [value]);

  // 字段配置相关的函数
  const getDisplayToSourceMap = () => {
    const map = {};

    fields.forEach((field) => {
      map[field.displayName] = field.sourceName;

      if (field.type === 'object' && field.fields) {
        field.fields.forEach((subfield) => {
          map[
            `${field.displayName}.${subfield.displayName}`
          ] = `${field.sourceName}.${subfield.sourceName}`;
        });
      }
    });

    return map;
  };

  const getSourceToDisplayMap = () => {
    const map = {};

    fields.forEach((field) => {
      map[field.sourceName] = field.displayName;

      if (field.type === 'object' && field.fields) {
        field.fields.forEach((subfield) => {
          map[
            `${field.sourceName}.${subfield.sourceName}`
          ] = `${field.displayName}.${subfield.displayName}`;
        });
      }
    });

    return map;
  };

  const getFieldTypeMap = () => {
    const map = {};

    fields.forEach((field) => {
      // 添加显示名和源名映射
      map[field.displayName] = field.type;
      map[field.sourceName] = field.type;

      if (field.type === 'object' && field.fields) {
        field.fields.forEach((subfield) => {
          map[`${field.displayName}.${subfield.displayName}`] = subfield.type;
          map[`${field.sourceName}.${subfield.sourceName}`] = subfield.type;
        });
      }
    });

    return map;
  };

  // 初始化函数类别和CSS动画
  useEffect(() => {
    // 初始化所有函数类别为展开状态
    const categories = {};
    functionConfig.getCategories().forEach((category) => {
      categories[category.name] = true; // 默认展开
    });
    setExpandedCategories(categories);

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-in-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 在字段数据变化时重新验证公式
  useEffect(() => {
    if (!isLoading && fields.length > 0) {
      validateFormula(isSourceMode ? sourceFormula : displayFormula);
    }
  }, [fields, isLoading]);

  // 切换函数类别展开/收起状态
  const toggleCategoryExpand = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // 工具函数

  // 规范化逗号 - 将中文逗号转换为英文逗号
  const normalizeCommas = (formula) => {
    return formula.replace(/，/g, ',');
  };

  // 根据模式获取当前公式
  const getCurrentFormula = () => {
    return isSourceMode ? sourceFormula : displayFormula;
  };

  // 将显示公式转换为源码公式
  const convertDisplayToSource = (formula) => {
    if (isLoading || fields.length === 0) return formula; // 如果字段正在加载，不执行转换

    let result = formula;
    // 先规范化逗号
    result = normalizeCommas(result);

    // 按长度排序键（最长的先）以防止部分匹配
    const displayToSourceMap = getDisplayToSourceMap();
    const keys = Object.keys(displayToSourceMap).sort((a, b) => b.length - a.length);

    for (const key of keys) {
      // 使用正则表达式防止部分匹配
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, displayToSourceMap[key]);
    }

    return result;
  };

  // 将源码公式转换为显示公式
  const convertSourceToDisplay = (formula) => {
    if (isLoading || fields.length === 0) return formula; // 如果字段正在加载，不执行转换

    let result = formula;
    // 先规范化逗号
    result = normalizeCommas(result);

    // 按长度排序键（最长的先）以防止部分匹配
    const sourceToDisplayMap = getSourceToDisplayMap();
    const keys = Object.keys(sourceToDisplayMap).sort((a, b) => b.length - a.length);

    for (const key of keys) {
      // 使用正则表达式防止部分匹配
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, sourceToDisplayMap[key]);
    }

    return result;
  };

  // 检查字符串是否为数字字面量
  const isNumericLiteral = (str) => {
    return /^-?\d+(\.\d+)?$/.test(str.trim());
  };

  // 检查字符串是否为布尔字面量
  const isBooleanLiteral = (str) => {
    const trimmed = str.trim().toLowerCase();
    return trimmed === 'true' || trimmed === 'false';
  };

  // 检查参数类型是否对函数有效
  const isParameterTypeValid = (paramValue, expectedType) => {
    if (isLoading || fields.length === 0) return true; // 如果字段正在加载，暂时返回true

    const cleanedValue = paramValue.trim();
    const fieldTypeMap = getFieldTypeMap();

    switch (expectedType) {
      case 'number':
        if (isNumericLiteral(cleanedValue)) return true;
        return fieldTypeMap[cleanedValue] === '数字';

      case 'boolean':
        if (isBooleanLiteral(cleanedValue)) return true;
        return true; // 简化起见

      default:
        return true;
    }
  };

  // 检查变量引用是否有效
  const isVariableValid = (variable) => {
    if (isLoading || fields.length === 0) return true; // 如果字段正在加载，暂时返回true

    const cleanedVar = variable.trim();
    const fieldTypeMap = getFieldTypeMap();

    if (isNumericLiteral(cleanedVar)) return true;
    if (isBooleanLiteral(cleanedVar)) return true;

    return !!fieldTypeMap[cleanedVar];
  };

  // 检查光标是否在函数调用内
  const isInsideFunction = () => {
    const formula = getCurrentFormula();
    let openParenCount = 0;

    for (let i = 0; i < cursorPosition; i++) {
      if (formula[i] === '(') openParenCount++;
      else if (formula[i] === ')') openParenCount--;
    }

    return openParenCount > 0;
  };

  // 检查在插入前是否需要逗号
  const needsCommaBeforeInsertion = () => {
    if (!isInsideFunction()) return false;

    const formula = getCurrentFormula();
    const textBeforeCursor = formula.substring(0, cursorPosition).trim();

    // 检查最后一个非空白字符是否是逗号、左括号或者为空
    return !(
      textBeforeCursor.endsWith(',') ||
      textBeforeCursor.endsWith('(') ||
      textBeforeCursor === ''
    );
  };

  // 在光标位置插入文本，并处理逗号
  const insertAtCursor = (displayText, sourceText) => {
    const currentFormula = getCurrentFormula();
    let insertText = isSourceMode ? sourceText : displayText;

    // 如果需要，添加逗号
    if (needsCommaBeforeInsertion()) {
      insertText = ', ' + insertText;
    }

    const newFormula =
      currentFormula.substring(0, cursorPosition) +
      insertText +
      currentFormula.substring(cursorPosition);

    let newSourceFormula, newDisplayFormula;

    if (isSourceMode) {
      newSourceFormula = newFormula;
      newDisplayFormula = convertSourceToDisplay(newFormula);
      setSourceFormula(newSourceFormula);
      setDisplayFormula(newDisplayFormula);
    } else {
      newDisplayFormula = newFormula;
      newSourceFormula = convertDisplayToSource(newFormula);
      setDisplayFormula(newDisplayFormula);
      setSourceFormula(newSourceFormula);
    }

    setCursorPosition(cursorPosition + insertText.length);

    // 验证更新后的公式
    validateFormula(newFormula);

    // 调用onChange通知Form
    if (onChange) {
      onChange({
        display: newDisplayFormula,
        source: newSourceFormula,
      });
    }
  };

  // 改进后的公式验证函数，支持嵌套函数类型检测
  const validateFormula = (formula) => {
    if (isLoading || fields.length === 0) return []; // 如果字段正在加载，不执行验证

    const errors = [];
    const fieldTypeMap = getFieldTypeMap();

    // 检查括号匹配
    const stack = [];
    for (let i = 0; i < formula.length; i++) {
      if (formula[i] === '(') {
        stack.push({ char: '(', position: i });
      } else if (formula[i] === ')') {
        if (stack.length === 0 || stack[stack.length - 1].char !== '(') {
          errors.push({
            type: 'bracket',
            message: `位置 ${i + 1} 处有多余的右括号`,
            position: i,
          });
        } else {
          stack.pop();
        }
      }
    }

    // 检查未闭合的括号
    if (stack.length > 0) {
      stack.forEach((item) => {
        errors.push({
          type: 'bracket',
          message: `位置 ${item.position + 1} 处的左括号未闭合`,
          position: item.position,
        });
      });
    }

    // 如果有括号错误，先返回这些错误
    if (errors.length > 0) {
      setValidationErrors(errors);
      return errors;
    }

    // 判断类型兼容性的辅助函数
    const isTypeCompatible = (sourceType, targetType) => {
      // 如果目标类型是'any'，任何类型都兼容
      if (targetType === 'any') return true;

      // 如果源类型和目标类型相同，兼容
      if (sourceType === targetType) return true;

      // 检查字段类型到JS类型的映射兼容性
      if (TYPE_MAP[sourceType] === targetType) return true;

      return false;
    };

    // 获取变量或字面量值的类型
    const getValueType = (value) => {
      const trimmed = value.trim();

      // 检查数字字面量
      if (isNumericLiteral(trimmed)) return 'number';

      // 检查布尔字面量
      if (isBooleanLiteral(trimmed)) return 'boolean';

      // 检查字符串字面量
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) return 'string';

      // 检查字段引用
      const fieldType = fieldTypeMap[trimmed];
      if (fieldType) {
        // 将字段类型映射到JS类型
        return TYPE_MAP[fieldType] || fieldType;
      }

      return null; // 未知类型
    };

    // 解析函数调用和参数的辅助函数，增加对返回类型的推断
    const parseFunctionCalls = (text, startOffset = 0) => {
      const functionMatches = [];
      let pos = 0;

      while (pos < text.length) {
        // 查找函数名称
        const functionMatch = text.substring(pos).match(/([A-Z][A-Za-z0-9]*)\s*\(/);
        if (!functionMatch) break;

        // 找到了潜在的函数调用
        const functionName = functionMatch[1];
        const functionStart = pos + functionMatch.index;
        const paramsStart = functionStart + functionMatch[0].length;

        // 查找匹配的闭合括号
        let openBrackets = 1;
        let paramsEnd = paramsStart;

        while (paramsEnd < text.length && openBrackets > 0) {
          if (text[paramsEnd] === '(') openBrackets++;
          else if (text[paramsEnd] === ')') openBrackets--;
          paramsEnd++;
        }

        if (openBrackets === 0) {
          // 成功找到了闭合括号，解析参数
          const paramsText = text.substring(paramsStart, paramsEnd - 1);
          const params = parseParameters(paramsText);

          // 获取函数定义
          const functionDef = functionConfig.getFunction(functionName);

          // 计算绝对位置信息
          const absoluteStart = functionStart + startOffset;
          const absoluteEnd = paramsEnd + startOffset;

          // 创建函数调用对象，包含返回类型信息
          const functionCall = {
            name: functionName,
            start: absoluteStart,
            end: absoluteEnd,
            params: params,
            paramTypes: [], // 将存储每个参数的类型
            nestedFunctions: [], // 将存储每个参数中的嵌套函数调用
            isNestedCall: startOffset > 0,
            fullText: text.substring(functionStart, paramsEnd),
            returnType: functionDef ? functionDef.returnType : null,
          };

          functionMatches.push(functionCall);

          // 递归解析每个参数中可能存在的嵌套函数
          for (let i = 0; i < params.length; i++) {
            const param = params[i];

            if (param.match(/[A-Z][A-Za-z0-9]*\s*\(/)) {
              // 计算参数在原始文本中的位置
              let paramOffset = 0;
              for (let j = 0; j < i; j++) {
                paramOffset += params[j].length + 1; // +1 为逗号
              }

              // 嵌套函数的起始偏移量
              const nestedOffset = absoluteStart + functionName.length + 1 + paramOffset;
              const nestedFunctions = parseFunctionCalls(param, nestedOffset);

              // 将嵌套函数保存到当前函数的参数信息中
              functionCall.nestedFunctions[i] = nestedFunctions;

              // 将嵌套函数添加到总函数列表
              functionMatches.push(...nestedFunctions);

              // 记录嵌套函数的返回类型作为参数类型
              if (nestedFunctions.length > 0) {
                // 假设参数就是一个单独的嵌套函数调用
                const outerNestedCall = nestedFunctions.find(
                  (call) => !call.isNestedCall || call.start === nestedOffset,
                );

                if (outerNestedCall) {
                  functionCall.paramTypes[i] = outerNestedCall.returnType;
                }
              }
            } else {
              // 对于非函数调用参数，直接确定其类型
              functionCall.paramTypes[i] = getValueType(param);
            }
          }
        }

        // 继续从函数结束位置搜索
        pos = paramsEnd;
      }

      return functionMatches;
    };

    // 解析参数列表的辅助函数，考虑嵌套函数调用
    const parseParameters = (paramsText) => {
      if (!paramsText.trim()) return [];

      const params = [];
      let currentParam = '';
      let openBrackets = 0;
      let inQuote = false;

      for (let i = 0; i < paramsText.length; i++) {
        const char = paramsText[i];

        // 处理引号内的文本（不处理转义情况，简化起见）
        if (char === '"' && (i === 0 || paramsText[i - 1] !== '\\')) {
          inQuote = !inQuote;
          currentParam += char;
          continue;
        }

        if (inQuote) {
          currentParam += char;
          continue;
        }

        if (char === '(') {
          openBrackets++;
          currentParam += char;
        } else if (char === ')') {
          openBrackets--;
          currentParam += char;
        } else if (char === ',' && openBrackets === 0) {
          // 只有在不在嵌套函数内部时，才将逗号视为参数分隔符
          params.push(currentParam.trim());
          currentParam = '';
        } else {
          currentParam += char;
        }
      }

      // 添加最后一个参数
      if (currentParam.trim()) {
        params.push(currentParam.trim());
      }

      return params;
    };

    // 检查整个公式是否是单个变量或常量
    if (!formula.includes('(')) {
      const singleToken = formula.trim();
      if (
        singleToken &&
        !isVariableValid(singleToken) &&
        !isNumericLiteral(singleToken) &&
        !isBooleanLiteral(singleToken)
      ) {
        errors.push({
          type: 'variable',
          message: `"${singleToken}" 不是有效的变量或常量`,
          variable: singleToken,
        });
      }

      setValidationErrors(errors);
      return errors;
    }

    // 解析所有函数调用
    const functionCalls = parseFunctionCalls(formula);

    // 如果没有找到函数调用但不是单变量
    if (
      functionCalls.length === 0 &&
      formula.trim() &&
      !isVariableValid(formula.trim()) &&
      !isNumericLiteral(formula.trim())
    ) {
      errors.push({
        type: 'syntax',
        message: `公式格式不正确: "${formula.trim()}"`,
      });

      setValidationErrors(errors);
      return errors;
    }

    // 找到真正的顶层函数调用(不是嵌套在其他函数中的调用)
    const rootCalls = functionCalls.filter((call) => !call.isNestedCall);

    // 检查公式结构 - 检查是否由单个函数组成或者直接是变量/常量
    if (rootCalls.length > 1) {
      errors.push({
        type: 'syntax',
        message: `公式中存在${rootCalls.length}个独立的函数调用，应该只有一个顶层函数调用`,
      });
    } else if (rootCalls.length === 1) {
      // 检查函数调用前后是否有无效内容
      const leadingContent = formula.substring(0, rootCalls[0].start).trim();
      const trailingContent = formula.substring(rootCalls[0].end).trim();

      if (leadingContent) {
        errors.push({
          type: 'syntax',
          message: `函数调用前存在无效内容: "${leadingContent}"`,
          position: 0,
        });
      }

      if (trailingContent) {
        errors.push({
          type: 'syntax',
          message: `函数调用后存在无效内容: "${trailingContent}"`,
          position: rootCalls[0].end,
        });
      }
    }

    // 验证每个函数调用（包括嵌套的）
    for (const call of functionCalls) {
      const functionName = call.name;
      const functionDef = functionConfig.getFunction(functionName);

      if (!functionDef) {
        errors.push({
          type: 'function',
          message: `未定义的函数: ${functionName}`,
          name: functionName,
        });
        continue;
      }

      // 检查参数数量
      if (call.params.length < functionDef.minParams) {
        errors.push({
          type: 'function',
          message: `函数 ${functionName} 至少需要 ${functionDef.minParams} 个参数，但只提供了 ${call.params.length} 个`,
          name: functionName,
        });
      }

      if (functionDef.maxParams !== null && call.params.length > functionDef.maxParams) {
        errors.push({
          type: 'function',
          message: `函数 ${functionName} 最多接受 ${functionDef.maxParams} 个参数，但提供了 ${call.params.length} 个`,
          name: functionName,
        });
      }

      // 检查每个参数
      for (let i = 0; i < call.params.length; i++) {
        const param = call.params[i];
        const paramType = call.paramTypes[i]; // 从函数调用对象获取的参数类型

        // 获取此参数位置的预期类型（支持可变参数）
        const expectedParamType =
          functionDef.paramTypes[Math.min(i, functionDef.paramTypes.length - 1)];

        // 如果参数是嵌套函数调用
        if (param.match(/^[A-Z][A-Za-z0-9]*\s*\(/)) {
          // 检查嵌套函数返回类型是否与当前函数参数类型兼容
          if (paramType && expectedParamType !== 'any') {
            if (!isTypeCompatible(paramType, expectedParamType)) {
              errors.push({
                type: 'returnType',
                message: `函数 ${functionName} 的第 ${
                  i + 1
                } 个参数需要类型 '${expectedParamType}'，但嵌套函数返回类型为 '${paramType}'`,
                function: functionName,
                paramIndex: i,
                expectedType: expectedParamType,
                actualType: paramType,
              });
            }
          }
        }
        // 对于非嵌套函数参数，验证变量或常量
        else {
          // 先检查是否是有效变量或常量
          if (
            !isNumericLiteral(param) &&
            !isBooleanLiteral(param) &&
            !param.startsWith('"') &&
            !isVariableValid(param)
          ) {
            errors.push({
              type: 'variable',
              message: `参数 "${param}" 不是有效的变量或常量`,
              variable: param,
            });
          }
          // 然后检查类型是否符合期望
          else if (expectedParamType !== 'any' && !isParameterTypeValid(param, expectedParamType)) {
            // 获取实际类型用于错误消息
            const actualType = getValueType(param);
            const expectedTypeName =
              expectedParamType === 'number'
                ? '数字'
                : expectedParamType === 'string'
                ? '文本'
                : expectedParamType === 'boolean'
                ? '布尔值'
                : expectedParamType;

            errors.push({
              type: 'type',
              message: `函数 ${functionName} 的第 ${
                i + 1
              } 个参数 "${param}" 类型错误，期望 ${expectedTypeName} 类型，实际是 ${
                actualType || '未知'
              } 类型`,
              function: functionName,
              variable: param,
              paramIndex: i,
              expectedType: expectedParamType,
              actualType: actualType,
            });
          }
        }
      }

      // 检查IF函数的特殊情况 - 推断返回类型
      if (functionName === 'IF' && call.params.length === 3) {
        // 如果true和false分支返回不同类型，IF函数的返回类型应该是'any'
        const trueValueType = call.paramTypes[1];
        const falseValueType = call.paramTypes[2];

        if (trueValueType && falseValueType && trueValueType !== falseValueType) {
          call.returnType = 'any';
        } else if (trueValueType) {
          // 如果两个分支类型相同，返回类型就是分支类型
          call.returnType = trueValueType;
        }
      }
    }

    setValidationErrors(errors);
    return errors;
  };

  // 切换源码模式
  const toggleSourceMode = () => {
    setIsSourceMode(!isSourceMode);
    validateFormula(isSourceMode ? displayFormula : sourceFormula);
  };

  // 处理函数点击
  const handleFunctionClick = (func) => {
    setSelectedFunction(func);

    // 修改：特殊处理函数插入，确保光标在括号内
    const functionText = func.name + '()';
    const cursorOffsetInBrackets = 1; // 右括号前的位置

    const currentFormula = getCurrentFormula();
    let insertText = functionText;

    // 如果需要，添加逗号
    if (needsCommaBeforeInsertion()) {
      insertText = ', ' + insertText;
    }

    const newFormula =
      currentFormula.substring(0, cursorPosition) +
      insertText +
      currentFormula.substring(cursorPosition);

    // 计算光标应该在的新位置（括号内）
    const newCursorPosition = cursorPosition + insertText.length - cursorOffsetInBrackets;

    let newSourceFormula, newDisplayFormula;

    if (isSourceMode) {
      newSourceFormula = newFormula;
      newDisplayFormula = convertSourceToDisplay(newFormula);
      setSourceFormula(newSourceFormula);
      setDisplayFormula(newDisplayFormula);
    } else {
      newDisplayFormula = newFormula;
      newSourceFormula = convertDisplayToSource(newFormula);
      setDisplayFormula(newDisplayFormula);
      setSourceFormula(newSourceFormula);
    }

    // 设置新的光标位置
    setCursorPosition(newCursorPosition);

    // 更新输入组件中的光标位置
    setTimeout(() => {
      if (inputRef.current && inputRef.current.setCaretPosition) {
        inputRef.current.setCaretPosition(newCursorPosition);
      }
    }, 10);

    // 验证更新后的公式
    validateFormula(newFormula);

    // 调用onChange通知Form
    if (onChange) {
      onChange({
        display: newDisplayFormula,
        source: newSourceFormula,
      });
    }
  };

  // 处理字段点击
  const handleFieldClick = (field) => {
    if (field.type === 'object' && field.fields) {
      // 对象类型，等待子字段选择
    } else {
      insertAtCursor(field.displayName, field.sourceName);
    }
  };

  // 处理子字段点击
  const handleSubfieldClick = (field, subfield) => {
    const displayText = `${field.displayName}.${subfield.displayName}`;
    const sourceText = `${field.sourceName}.${subfield.sourceName}`;
    insertAtCursor(displayText, sourceText);
  };

  // 处理公式输入变化
  const handleFormulaChange = (e) => {
    // 立即规范化逗号
    const newValue = normalizeCommas(e.target.value);

    let newSourceFormula, newDisplayFormula;

    if (isSourceMode) {
      newSourceFormula = newValue;
      newDisplayFormula = convertSourceToDisplay(newValue);
      setSourceFormula(newSourceFormula);
      setDisplayFormula(newDisplayFormula);
    } else {
      newDisplayFormula = newValue;
      newSourceFormula = convertDisplayToSource(newValue);
      setDisplayFormula(newDisplayFormula);
      setSourceFormula(newSourceFormula);
    }

    validateFormula(newValue);

    // 调用onChange通知Form
    if (onChange) {
      onChange({
        display: newDisplayFormula,
        source: newSourceFormula,
      });
    }
  };

  const handleFormulaSelect = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  const handleFunctionHover = (func) => {
    setHoveredFunction(func);
  };

  const handleFunctionLeave = () => {
    setHoveredFunction(null);
  };

  // 计算公式结果
  const calculateFormulaResult = (formula, testData) => {
    try {
      // 基本运算的简化计算器
      const functionPattern = /([A-Z][A-Za-z0-9]*)\s*\((.*)\)/;
      const mainMatch = formula.match(functionPattern);

      if (mainMatch) {
        const functionName = mainMatch[1];
        const argsString = mainMatch[2];

        // 检查函数是否存在
        const functionDef = functionConfig.getFunction(functionName);
        if (!functionDef) {
          throw new Error(`未定义的函数: ${functionName}`);
        }

        // 处理参数
        const args = argsString.split(',').map((arg) => {
          const trimmedArg = arg.trim();

          // 数字字面量
          if (isNumericLiteral(trimmedArg)) {
            return parseFloat(trimmedArg);
          }

          // 布尔字面量
          if (isBooleanLiteral(trimmedArg)) {
            return trimmedArg.toLowerCase() === 'true';
          }

          // 变量引用（嵌套或非嵌套）
          const parts = trimmedArg.split('.');

          if (parts.length === 1) {
            return testData[trimmedArg];
          } else {
            let value = testData;
            for (const part of parts) {
              if (value === undefined || value === null) {
                throw new Error(`找不到测试数据中的变量: ${trimmedArg}`);
              }
              value = value[part];
            }
            return value;
          }
        });

        // 执行函数
        return functionDef.evaluate(...args);
      } else {
        // 非函数调用，可能是变量或常量
        if (isNumericLiteral(formula)) {
          return parseFloat(formula);
        } else if (isBooleanLiteral(formula)) {
          return formula.toLowerCase() === 'true';
        } else {
          // 变量引用
          const parts = formula.trim().split('.');

          if (parts.length === 1) {
            return testData[formula.trim()];
          } else {
            let value = testData;
            for (const part of parts) {
              if (value === undefined) {
                throw new Error(`找不到测试数据中的变量: ${formula}`);
              }
              value = value[part];
            }
            return value;
          }
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const handleTestDataChange = (e) => {
    setTestDataInput(e.target.value);
  };

  // 根据公式自动生成测试数据
  const generateTestData = () => {
    if (isLoading || fields.length === 0) return '{}'; // 如果字段正在加载，返回空对象

    const formula = sourceFormula;
    const testData = {};

    // 提取字段引用
    const fieldReferences = [];

    // 检查基本字段引用
    fields.forEach((field) => {
      if (formula.includes(field.sourceName)) {
        fieldReferences.push(field);
      }

      // 检查对象字段引用
      if (field.type === 'object' && field.fields) {
        field.fields.forEach((subfield) => {
          const fullPath = `${field.sourceName}.${subfield.sourceName}`;
          if (formula.includes(fullPath)) {
            fieldReferences.push({
              parentField: field,
              field: subfield,
              fullPath,
            });
          }
        });
      }
    });

    // 创建样本数据
    fieldReferences.forEach((ref) => {
      if (ref.parentField) {
        // 子字段
        if (!testData[ref.parentField.sourceName]) {
          testData[ref.parentField.sourceName] = {};
        }

        // 根据类型生成值
        if (ref.field.type === '数字') {
          testData[ref.parentField.sourceName][ref.field.sourceName] = 100;
        } else if (ref.field.type === '文本') {
          testData[ref.parentField.sourceName][ref.field.sourceName] = '示例文本';
        } else {
          testData[ref.parentField.sourceName][ref.field.sourceName] = true;
        }
      } else {
        // 顶层字段
        // 根据类型生成值
        if (ref.type === '数字') {
          testData[ref.sourceName] = 100;
        } else if (ref.type === '文本') {
          testData[ref.sourceName] = '示例文本';
        } else if (ref.type === 'object') {
          testData[ref.sourceName] = {}; // 创建空对象
        } else {
          testData[ref.sourceName] = true;
        }
      }
    });

    return JSON.stringify(testData, null, 2);
  };

  // 自动生成测试数据并运行测试
  const handleGenerateTestData = () => {
    const generatedData = generateTestData();
    setTestDataInput(generatedData);
    // 更新数据后会自动触发测试
  };

  const testFormula = () => {
    try {
      const testData = JSON.parse(testDataInput);
      const result = calculateFormulaResult(sourceFormula, testData);

      setTestResult(result);
      setTestError(null);
    } catch (error) {
      setTestError(error.message);
      setTestResult(null);
    }
  };

  const showTestModal = () => {
    setTestModalVisible(true);
    setTestResult(null);
    setTestError(null);
    // 打开模态窗口后会自动运行测试
  };

  const hideTestModal = () => {
    setTestModalVisible(false);
  };

  const getFilteredFields = () => {
    if (isLoading) return [];

    if (!searchFieldTerm) return fields;

    return fields.filter((field) => {
      const nameToSearch = isSourceMode ? field.sourceName : field.displayName;
      return nameToSearch.toLowerCase().includes(searchFieldTerm.toLowerCase());
    });
  };

  const getFilteredFunctions = () => {
    const allFunctions = functionConfig.getAllFunctions();

    if (!searchFuncTerm) return allFunctions;

    return allFunctions.filter(
      (func) =>
        func.name.toLowerCase().includes(searchFuncTerm.toLowerCase()) ||
        func.description.toLowerCase().includes(searchFuncTerm.toLowerCase()),
    );
  };

  // 获取字段和函数的高亮模式
  const getHighlightPattern = () => {
    if (isLoading || fields.length === 0) return null;

    const fieldPatterns = [];

    if (isSourceMode) {
      fields.forEach((field) => {
        const escapedName = field.sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        fieldPatterns.push(escapedName);

        if (field.type === 'object' && field.fields) {
          field.fields.forEach((subfield) => {
            const pattern = `${escapedName}\\.${subfield.sourceName.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            )}`;
            fieldPatterns.push(pattern);
          });
        }
      });
    } else {
      fields.forEach((field) => {
        const escapedName = field.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        fieldPatterns.push(escapedName);

        if (field.type === 'object' && field.fields) {
          field.fields.forEach((subfield) => {
            const pattern = `${escapedName}\\.${subfield.displayName.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&',
            )}`;
            fieldPatterns.push(pattern);
          });
        }
      });
    }

    if (fieldPatterns.length === 0) {
      return null;
    }

    return new RegExp(`(${fieldPatterns.join('|')})`, 'g');
  };

  // 获取所有用于高亮的函数名
  const getFunctionNames = () => {
    return functionConfig.getAllFunctions().map((func) => func.name);
  };

  const groupedFunctions = () => {
    const filtered = getFilteredFunctions();
    const grouped = {};

    functionConfig.getCategories().forEach((category) => {
      grouped[category.name] = [];

      category.functions.forEach((func) => {
        if (filtered.includes(func)) {
          grouped[category.name].push(func);
        }
      });
    });

    return grouped;
  };

  // 获取筛选后的字段列表
  const filteredFields = getFilteredFields();

  return (
    <>
      {contextHolder}
      <div className="w-full h-full bg-gray-50 border border-gray-200 rounded-lg shadow-lg overflow-hidden font-sans">
        {/* 头部 */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 bg-white">
          <Typography.Title
            level={4}
            className="m-0 text-indigo-700"
          >
            公式编辑器
          </Typography.Title>
          <div className="flex items-center">
            <div className="mr-6 flex items-center space-x-4">
              <Button
                type="default"
                icon={<ExperimentOutlined />}
                onClick={showTestModal}
                className="flex items-center"
                disabled={validationErrors.length > 0 || isLoading}
              >
                测试
              </Button>
              <Space>
                <Text className="text-sm font-medium text-gray-700">源码模式</Text>
                <Switch
                  checked={isSourceMode}
                  onChange={toggleSourceMode}
                  className={isSourceMode ? 'bg-indigo-600' : ''}
                />
              </Space>
            </div>
            {onCancel && (
              <Button
                type="text"
                icon={<CloseOutlined />}
                className="text-gray-500 hover:text-gray-700"
                shape="circle"
                onClick={onCancel}
              />
            )}
          </div>
        </div>

        {/* 公式编辑区 */}
        <div className="border-b border-gray-200 p-5 bg-white shadow-sm">
          <div className="mb-2">
            <div className="flex items-center mb-2.5">
              <div className="font-semibold text-gray-800 mr-2 flex items-center">
                <CodeOutlined className="mr-1.5 text-indigo-500" />
                公式
              </div>
              <Tag
                color={isSourceMode ? 'blue' : 'default'}
                className="mr-2"
              >
                {isSourceMode ? '源码格式' : '显示格式'}
              </Tag>
              {validationErrors.length > 0 && (
                <Tooltip
                  title={<ErrorPopoverContent errors={validationErrors} />}
                  color="#fff"
                  styles={{ body: { color: '#333' } }}
                  placement="right"
                >
                  <Tag
                    color="error"
                    icon={<WarningOutlined />}
                    className="cursor-help"
                  >
                    {validationErrors.length}个错误
                  </Tag>
                </Tooltip>
              )}
            </div>

            <HighlightedFormulaInput
              ref={inputRef}
              value={getCurrentFormula()}
              onChange={handleFormulaChange}
              onSelect={handleFormulaSelect}
              highlightPattern={getHighlightPattern()}
              functionNames={getFunctionNames()}
              isSourceMode={isSourceMode}
            />
          </div>
        </div>

        {/* 主内容区的三栏布局 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左栏 - 字段 */}
          <div
            className="w-1/3 border-r border-gray-200 flex flex-col bg-white"
            style={{ height: `${PANEL_HEIGHT}px` }}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="font-medium text-gray-800 mb-2.5 flex items-center">
                <FileTextOutlined className="mr-1.5 text-indigo-500" />
                <span>表单字段</span>
              </div>
              <div className="relative">
                <Input
                  placeholder="搜索字段..."
                  className="w-full"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  value={searchFieldTerm}
                  onChange={(e) => setSearchFieldTerm(e.target.value)}
                  allowClear
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {isLoading ? (
                <FieldsLoadingState />
              ) : filteredFields.length > 0 ? (
                filteredFields.map((field, index) => (
                  <Card
                    key={index}
                    size="small"
                    className="border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                    styles={{ body: { padding: '8px 12px' } }}
                  >
                    <div onClick={() => handleFieldClick(field)}>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <Text
                            strong
                            className="text-gray-800"
                          >
                            {isSourceMode ? field.sourceName : field.displayName}
                          </Text>
                          {!isSourceMode && (
                            <Text
                              type="secondary"
                              className="text-xs mt-0.5"
                            >
                              {field.sourceName}
                            </Text>
                          )}
                        </div>
                        <TypeBadge type={field.type} />
                      </div>
                    </div>

                    {field.type === 'object' && field.fields && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-200 bg-gray-50 rounded-md px-2 py-0.5">
                        <div className="space-y-1">
                          {field.fields.map((subfield, subIndex) => (
                            <div
                              key={subIndex}
                              className="py-1 px-1.5 rounded-md hover:bg-white cursor-pointer flex justify-between items-center transition-colors"
                              onClick={(e) => {
                                e.stopPropagation(); // 防止冒泡触发父级的点击事件
                                handleSubfieldClick(field, subfield);
                              }}
                            >
                              <div className="flex flex-col">
                                <Text className="text-gray-800 text-sm">
                                  {isSourceMode ? subfield.sourceName : subfield.displayName}
                                </Text>
                                {!isSourceMode && (
                                  <Text
                                    type="secondary"
                                    className="text-xs mt-0.5"
                                  >
                                    {subfield.sourceName}
                                  </Text>
                                )}
                              </div>
                              <TypeBadge type={subfield.type} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              ) : (
                <Empty description="未找到匹配的字段" />
              )}
            </div>
          </div>

          {/* 中栏 - 函数 */}
          <div
            className="w-1/3 border-r border-gray-200 flex flex-col bg-white"
            style={{ height: `${PANEL_HEIGHT}px` }}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="font-medium text-gray-800 mb-2.5 flex items-center">
                <FunctionOutlined className="mr-1.5 text-indigo-500" />
                <span>函数列表</span>
              </div>
              <div className="relative">
                <Input
                  placeholder="搜索函数..."
                  className="w-full"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  value={searchFuncTerm}
                  onChange={(e) => setSearchFuncTerm(e.target.value)}
                  allowClear
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5">
              {Object.entries(groupedFunctions()).map(
                ([category, functions]) =>
                  functions.length > 0 && (
                    <div
                      key={category}
                      className="mb-3"
                    >
                      <div
                        className="font-medium text-sm text-gray-700 mb-1.5 px-2 flex justify-between items-center py-1.5 bg-indigo-50 rounded-md cursor-pointer hover:bg-indigo-100 transition-colors border-l-4 border-indigo-300"
                        onClick={() => toggleCategoryExpand(category)}
                      >
                        <div className="flex items-center">
                          <span className="mr-1.5 text-indigo-600 text-xs">
                            {expandedCategories[category] ? (
                              <CaretDownOutlined />
                            ) : (
                              <CaretDownOutlined className="transform -rotate-90" />
                            )}
                          </span>
                          <span className="font-semibold text-indigo-800">{category}</span>
                        </div>
                        <Tag
                          color="blue"
                          size="small"
                          className="text-xs"
                        >
                          {functions.length}
                        </Tag>
                      </div>

                      {expandedCategories[category] && (
                        <div className="space-y-1.5">
                          {functions.map((func, funcIndex) => (
                            <Card
                              key={funcIndex}
                              size="small"
                              className={`cursor-pointer transition-all ${
                                selectedFunction?.name === func.name
                                  ? 'border-indigo-300 shadow-sm bg-indigo-50'
                                  : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                              onClick={() => handleFunctionClick(func)}
                              onMouseEnter={() => handleFunctionHover(func)}
                              onMouseLeave={handleFunctionLeave}
                              styles={{ body: { padding: '6px 10px' } }}
                            >
                              <div className="flex items-center">
                                <Text
                                  strong
                                  className="text-indigo-600"
                                >
                                  {func.name}
                                </Text>
                                <Text
                                  type="secondary"
                                  className="ml-1 text-xs truncate"
                                >
                                  （{func.description}）
                                </Text>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
              )}
            </div>
          </div>

          {/* 右栏 - 函数详情 */}
          <div
            className="w-1/3 flex flex-col h-full bg-white"
            style={{ height: `${PANEL_HEIGHT}px` }}
          >
            <div className="p-3 border-b border-gray-200">
              <div className="font-medium text-gray-800 flex items-center">
                <InfoCircleOutlined className="mr-1.5 text-indigo-500" />
                <span>函数详情</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3">
              {hoveredFunction || selectedFunction ? (
                <Card className="border border-gray-200 shadow-sm animate-fadeIn">
                  <Typography.Title
                    level={4}
                    className="text-indigo-700 mb-2.5 pb-2 border-b border-gray-100 mt-0"
                  >
                    {(hoveredFunction || selectedFunction).name}
                  </Typography.Title>

                  <Paragraph className="mb-3.5 text-gray-700">
                    {(hoveredFunction || selectedFunction).description}
                  </Paragraph>

                  <div className="mb-3.5">
                    <div className="font-medium text-sm text-gray-700 mb-1 flex items-center">
                      <CodeOutlined className="mr-1 text-indigo-500" />
                      语法:
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-md font-mono text-sm border border-gray-200">
                      {(hoveredFunction || selectedFunction).syntax}
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <div className="font-medium text-sm text-gray-700 mb-1 flex items-center">
                      <CalculatorOutlined className="mr-1 text-indigo-500" />
                      示例:
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-md font-mono text-sm border border-gray-200">
                      {(hoveredFunction || selectedFunction).example}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-1.5 flex items-center">
                      <CheckCircleOutlined className="mr-1 text-indigo-500" />
                      参数要求:
                    </div>
                    <List
                      className="bg-gray-50 p-2.5 rounded-md border border-gray-200"
                      size="small"
                      split={false}
                      dataSource={[
                        {
                          label: '最少参数',
                          value: (hoveredFunction || selectedFunction).minParams,
                        },
                        ...((hoveredFunction || selectedFunction).maxParams
                          ? [
                              {
                                label: '最多参数',
                                value: (hoveredFunction || selectedFunction).maxParams,
                              },
                            ]
                          : []),
                        {
                          label: '参数类型',
                          value:
                            (hoveredFunction || selectedFunction).paramTypes[0] === 'number'
                              ? '数字'
                              : (hoveredFunction || selectedFunction).paramTypes[0] === 'string'
                              ? '文本'
                              : (hoveredFunction || selectedFunction).paramTypes[0] === 'boolean'
                              ? '布尔值'
                              : '任意',
                        },
                      ]}
                      renderItem={(item) => (
                        <List.Item className="py-0.5">
                          <div className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
                            {item.label}:{' '}
                            <Text
                              strong
                              className="ml-1"
                            >
                              {item.value}
                            </Text>
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                </Card>
              ) : (
                <Empty
                  className="h-full flex items-center justify-center"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="鼠标悬停或选择函数查看详情"
                />
              )}
            </div>
          </div>
        </div>

        {/* 底部 - 移除确认按钮，只保留取消按钮（如果有必要） */}
        {onCancel && (
          <div className="flex justify-end p-4 border-t border-gray-200 bg-white">
            <Button onClick={onCancel}>取消</Button>
          </div>
        )}
      </div>

      {/* 测试模态窗口 */}
      <TestModal
        visible={testModalVisible}
        onCancel={hideTestModal}
        onTest={testFormula}
        formula={sourceFormula}
        testDataInput={testDataInput}
        onTestDataChange={handleTestDataChange}
        onGenerateTestData={handleGenerateTestData}
        testResult={testResult}
        testError={testError}
        validationErrors={validationErrors}
      />
    </>
  );
};

export default FormulaEditor;
