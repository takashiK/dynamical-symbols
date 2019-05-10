# Dynamical Symbols

## Features

This extention provide DocumentSymbols by reguler expression list.
It works like "find" command. And It can append additional entries.
so this extention is useful that understand structure of text.

| Command                 | Description                          |
| :---------------------- | :----------------------------------- |
| Dynamical Symbols       | Create a new Symbol RegExp Set       |
| Dynamical Symbols: Add  | Add RegExp to current Set            |
| Dynamical Symbols: Fix  | Fix RegExp string on current Set     |
| Dynamical Symbols: Load | Load Symbol RegExp Set from Settings |
| Dynamical Symbols: Save | Save Symbol RegExp Set to Settings   |

## Requirements

vscode need support outline.

## Extension Settings

Symbol RegExp Set is saved to 'dynamical-symbols.definitions'.
You can modify that data directly. but "Dynamical Symbols: Save" is more useful than it.
If you want delete RegExp Set then delete setting directly.
We don't provide delete RegExp Set function.

## Known Issues

Current version is not support below

- ignore case
- pure word search (non reguler expression search)

## Release Notes

### 1.0.0

Initial release of Dynamical Symbols.

