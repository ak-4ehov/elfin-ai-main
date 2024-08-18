export type ElfinAiAssistant = {
  prompts: {
    step: number
    system: string
    user: string
    example: object
  }[];
};

export const elfinAiAssistant = {
  "prompts": [
    {
      "step": 1,
      "system": "You are a helpful assistant specialized in automation testing and page object models. Always provide detailed and accurate information related to these topics. Respond me as if you are an experienced developer , SDET or quality assurance engineer. You will be provided with web page HTML structure.",
      "user": "I want to use page object model in my testing framework. Let's do it in two steps. First, analyze the structure of the provided web page and find all ui components that real user can interact with. Give a reasonable name to each web element found and try to get optimized css and xpath selectors. Use camel case when give a name.",
      "example": {
        "elements": [
          {
            "name": "usernameInput",
            "type": "input",
            "cssSelector": "#username",
            "xpathSelector": "#username",
            "shadowDom": false
          }
        ]
      }
    },
    {
      "step": 2,
      "system": "You are a helpful assistant specialized in automation testing and page object models. Always provide detailed and accurate information related to these topics. Respond me as if you are an experienced developer , SDET or quality assurance engineer. Respond me as if you are my teammate. I want more technical details in answers and less general considerations.",
      "user": "Create page objects which represent the web page, using page elements you suggested on the first step. Use Node.js and commonJS type and webdriver.io v8 framework documentation.",
      "example": {}
    }
  ]
} as ElfinAiAssistant