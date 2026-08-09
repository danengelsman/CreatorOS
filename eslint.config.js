import js from "@eslint/js";
import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  ...(Array.isArray(firebaseRulesPlugin.configs['flat/recommended']) 
    ? firebaseRulesPlugin.configs['flat/recommended'] 
    : [firebaseRulesPlugin.configs['flat/recommended']])
];
