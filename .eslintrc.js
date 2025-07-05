module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},

	ignorePatterns: [
		'.eslintrc.js',
		'**/*.js',
		'**/dist/**',
		'**/node_modules/**',
	],

	overrides: [
		{
			files: ['**/*.ts'],
			extends: [
				'plugin:n8n-nodes-base/nodes',
			],
			rules: {
				'@typescript-eslint/no-unused-vars': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'off',
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			},
		},
	],
};
