#!/usr/bin/env node

const scriptName = process.argv[2] || 'command';

const messages = {
  lint: 'Harness Lab keeps lint as a template guard. Bind a real lint command in the target project; see README.md -> 快速开始 -> 接入后配置.',
  test: 'Harness Lab keeps test as a template guard until the target project binds a real test command.',
  build: 'Harness Lab keeps build as a template guard. Bind a real build command in the target project; see README.md -> 快速开始 -> 接入后配置.',
  verify:
    'Harness Lab keeps verify as a template guard until the target project binds a real verify chain or enough real lint/test/build commands for auto-generation.',
};

console.error(messages[scriptName] || `Harness Lab keeps ${scriptName} as a template guard until the target project binds a real command.`);
process.exit(1);
