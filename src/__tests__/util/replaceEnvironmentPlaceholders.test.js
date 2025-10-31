const replaceEnvironmentPlaceholders = require('./../../util/replaceEnvironmentPlaceholders');
//import { replaceEnvironmentPlaceholders } from "./../../util/replaceEnvironmentPlaceholders";

// /home/kaiklemola/git/hassu/src/util/replaceEnvironmentPlaceholders.js
// /home/kaiklemola/git/hassu/src/__tests__/util/replaceEnvironmentPlaceholders.test.js

describe('Environment variable placeholder replacement', () => {
  it('replaces plain text', () => {
    const env = { NEXT_PUBLIC_PLAIN_TEXT: 'HelloWorld' };
    const input = 'Message: _NEXT_PUBLIC_PLAIN_TEXT_';
    const output = replaceEnvironmentPlaceholders(input, env);
    expect(output).toBe('Message: HelloWorld');
  });

  it('replaces string with spaces', () => {
    const env = { NEXT_PUBLIC_GREETING: 'Hello, Kai!' };
    const input = 'Greeting: _NEXT_PUBLIC_GREETING_';
    const output = replaceEnvironmentPlaceholders(input, env);
    expect(output).toBe('Greeting: Hello, Kai!');
  });

  it('replaces date string', () => {
    const env = { NEXT_PUBLIC_DATE: '2025-10-31' };
    const input = 'Today is: _NEXT_PUBLIC_DATE_';
    const output = replaceEnvironmentPlaceholders(input, env);
    expect(output).toBe('Today is: 2025-10-31');
  });

  it('replaces JSON object', () => {
    const env = {
      NEXT_PUBLIC_CONFIG: '{"apiUrl":"https://example.com","featureFlag":true}',
    };
    const input = 'Config: _NEXT_PUBLIC_CONFIG_';
    const output = replaceEnvironmentPlaceholders(input, env);
    expect(output).toBe('Config: {"apiUrl":"https://example.com","featureFlag":true}');
  });

  it('replaces string with special characters', () => {
    const env = {
      NEXT_PUBLIC_SPECIAL: 'Path: /home/user & status: "active"',
    };
    const input = 'Info: _NEXT_PUBLIC_SPECIAL_';
    const output = replaceEnvironmentPlaceholders(input, env);
    expect(output).toBe('Info: Path: /home/user & status: "active"');
  });

  it('leaves unknown placeholders unchanged', () => {
    const env = {};
    const input = 'Unknown: _NEXT_PUBLIC_UNKNOWN_';
    const output = replaceEnvironmentPlaceholders(input, env);
    expect(output).toBe('Unknown: _NEXT_PUBLIC_UNKNOWN_');
  });
});