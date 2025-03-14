// constants.js - 存放公式编辑器的常量定义

// 面板高度
export const PANEL_HEIGHT = 500; // 三栏布局高度（像素）

// 默认函数类别和定义
export const DEFAULT_FUNCTION_CATEGORIES = [
  {
    name: '基础运算',
    functions: [
      {
        name: 'ADD',
        description: '加法运算',
        syntax: 'ADD(num1, num2, ...)',
        example: 'ADD(1, 2, 3) = 6',
        minParams: 1,
        maxParams: null,
        paramTypes: ['number'],
        evaluate: (...args) => args.reduce((sum, val) => sum + val, 0),
      },
      {
        name: 'SUBTRACT',
        description: '减法运算',
        syntax: 'SUBTRACT(num1, num2)',
        example: 'SUBTRACT(5, 3) = 2',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['number'],
        evaluate: (a, b) => a - b,
      },
      {
        name: 'MULTIPLY',
        description: '乘法运算',
        syntax: 'MULTIPLY(num1, num2, ...)',
        example: 'MULTIPLY(2, 3, 4) = 24',
        minParams: 2,
        maxParams: null,
        paramTypes: ['number'],
        evaluate: (...args) => args.reduce((product, val) => product * val, 1),
      },
      {
        name: 'DIVIDE',
        description: '除法运算',
        syntax: 'DIVIDE(num1, num2)',
        example: 'DIVIDE(10, 2) = 5',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['number'],
        evaluate: (a, b) => (b !== 0 ? a / b : 'Error: Division by zero'),
      },
    ],
  },
  {
    name: '逻辑函数',
    functions: [
      {
        name: 'IF',
        description: '条件判断，如果条件为真返回第一个值，否则返回第二个值',
        syntax: 'IF(condition, value_if_true, value_if_false)',
        example: 'IF(GT(5, 3), "Yes", "No") = "Yes"',
        minParams: 3,
        maxParams: 3,
        paramTypes: ['boolean', 'any', 'any'],
        evaluate: (condition, trueVal, falseVal) => (condition ? trueVal : falseVal),
      },
      {
        name: 'AND',
        description: '逻辑与，所有参数都为真时返回真',
        syntax: 'AND(logical1, logical2, ...)',
        example: 'AND(true, true, false) = false',
        minParams: 2,
        maxParams: null,
        paramTypes: ['boolean'],
        evaluate: (...args) => args.every(Boolean),
      },
      {
        name: 'OR',
        description: '逻辑或，任一参数为真时返回真',
        syntax: 'OR(logical1, logical2, ...)',
        example: 'OR(false, true, false) = true',
        minParams: 2,
        maxParams: null,
        paramTypes: ['boolean'],
        evaluate: (...args) => args.some(Boolean),
      },
    ],
  },
  {
    name: '文本函数',
    functions: [
      {
        name: 'CONCATENATE',
        description: '连接多个文本字符串',
        syntax: 'CONCATENATE(text1, text2, ...)',
        example: 'CONCATENATE("Hello", " ", "World") = "Hello World"',
        minParams: 1,
        maxParams: null,
        paramTypes: ['string'],
        evaluate: (...args) => args.join(''),
      },
    ],
  },
];

// 字段类型映射
export const FIELD_TYPE_CONFIG = {
  '数字': { color: 'blue', label: '数字' },
  '文本': { color: 'green', label: '文本' },
  '时间': { color: 'purple', label: '时间' },
  'object': { color: 'default', label: '对象' },
};

// 默认的初始公式
export const DEFAULT_FORMULA = {
  display: 'ADD(1, 1)',
  source: 'ADD(1, 1)'
};

// 默认的测试数据
export const DEFAULT_TEST_DATA = '{ "person": { "id": 123, "count": 5 }, "price": 25, "version": 2 }';