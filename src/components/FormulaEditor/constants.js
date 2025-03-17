// constants.js - 存放公式编辑器的常量定义

// 面板高度
export const PANEL_HEIGHT = 500; // 三栏布局高度（像素）

// 类型显示映射 - 技术类型到显示名称的映射
export const TYPE_DISPLAY_MAP = {
  'number': '数字',
  'string': '文本',
  'boolean': '布尔值',
  'date': '时间',
  'object': '对象',
  'any': '任意类型'
};

// 类型映射关系 - 将显示类型映射到技术类型
export const TYPE_MAP = {
  '数字': 'number',
  '文本': 'string',
  '时间': 'date',
  'object': 'object',
  'boolean': 'boolean'
};

// 字段类型配置 - 用于视觉展示
export const FIELD_TYPE_CONFIG = {
  '数字': { color: 'blue', label: '数字' },
  '文本': { color: 'green', label: '文本' },
  '时间': { color: 'purple', label: '时间' },
};

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
        returnType: 'number',
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
        returnType: 'number',
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
        returnType: 'number',
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
        returnType: 'number',
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
        returnType: 'any', // IF可以返回任何类型，取决于参数
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
        returnType: 'boolean',
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
        returnType: 'boolean',
        evaluate: (...args) => args.some(Boolean),
      },
      {
        name: 'GT',
        description: '大于比较，如果第一个数大于第二个数则返回真',
        syntax: 'GT(num1, num2)',
        example: 'GT(5, 3) = true',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['number'],
        returnType: 'boolean',
        evaluate: (a, b) => a > b,
      },
      {
        name: 'LT',
        description: '小于比较，如果第一个数小于第二个数则返回真',
        syntax: 'LT(num1, num2)',
        example: 'LT(5, 3) = false',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['number'],
        returnType: 'boolean',
        evaluate: (a, b) => a < b,
      },
      {
        name: 'EQ',
        description: '等于比较，如果两个值相等则返回真',
        syntax: 'EQ(value1, value2)',
        example: 'EQ(5, 5) = true',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['any'],
        returnType: 'boolean',
        evaluate: (a, b) => a === b,
      },
      {
        name: 'NEQ',
        description: '不等于比较，如果两个值不相等则返回真',
        syntax: 'NEQ(value1, value2)',
        example: 'NEQ(5, 3) = true',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['any'],
        returnType: 'boolean',
        evaluate: (a, b) => a !== b,
      },
      {
        name: 'GTE',
        description: '大于等于比较，如果第一个数大于或等于第二个数则返回真',
        syntax: 'GTE(num1, num2)',
        example: 'GTE(5, 5) = true',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['number'],
        returnType: 'boolean',
        evaluate: (a, b) => a >= b,
      },
      {
        name: 'LTE',
        description: '小于等于比较，如果第一个数小于或等于第二个数则返回真',
        syntax: 'LTE(num1, num2)',
        example: 'LTE(3, 5) = true',
        minParams: 2,
        maxParams: 2,
        paramTypes: ['number'],
        returnType: 'boolean',
        evaluate: (a, b) => a <= b,
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
        returnType: 'string',
        evaluate: (...args) => args.join(''),
      },
    ],
  },
];

// 默认的初始公式
export const DEFAULT_FORMULA = {
  display: 'ADD(1, 1)',
  source: 'ADD(1, 1)'
};

// 默认的测试数据
export const DEFAULT_TEST_DATA = '{ "price": 25, "version": 2 }';