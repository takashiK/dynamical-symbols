// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DynamicSymbolProvider } from './dynamicSymbolProvider';

export type LocalInstance = {
	cmd_count: number;
	current: string[];
	showInputBox: (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken) => Thenable<string | undefined>;
	showQuickPick: (items: string[] | Thenable<string[]>, options?: vscode.QuickPickOptions, token?: vscode.CancellationToken) => Thenable<string | undefined>;
	registerDocumentSymbolProvider: (selector: vscode.DocumentSelector, provider: vscode.DocumentSymbolProvider, metaData?: vscode.DocumentSymbolProviderMetadata) => vscode.Disposable;
	buttons: vscode.QuickInputButton[];
};

export type Subscription = {
	label?: string;
	dispose(): any;
};

export async function showSymbolDefBox(instance: LocalInstance) {
	let input = vscode.window.createInputBox();
	input.buttons = instance.buttons;
	input.show();

}

export async function defineSymbols(instance: LocalInstance, subscriptions: Subscription[]) {
	var result = await instance.showInputBox({ placeHolder: "Please enter new RegExp for Symbol." });

	if (result !== undefined) {
		if (subscriptions.length > instance.cmd_count) {
			subscriptions[subscriptions.length - 1].dispose();
			subscriptions.pop();
		}

		if (result.length === 0) {
			instance.current = [];
		}else{
			const current = [result];
			instance.current = current;

			subscriptions.push(
				instance.registerDocumentSymbolProvider(
					[{ scheme: 'file' }, { scheme: 'untitled' }], new DynamicSymbolProvider(current)
				)
			);
		}
	}

}

export async function addSymbols(instance: LocalInstance, subscriptions: Subscription[]) {
	var result = await instance.showInputBox({ placeHolder: "Please enter additional RegExp for Symbol" });

	if (result !== undefined && result.length > 0) {
		if (subscriptions.length > instance.cmd_count) {
			subscriptions[subscriptions.length - 1].dispose();
			subscriptions.pop();
		}

		const current = instance.current;
		current.push(result);
		instance.current = current;

		subscriptions.push(
			instance.registerDocumentSymbolProvider(
				[{ scheme: 'file' }, { scheme: 'untitled' }], new DynamicSymbolProvider(current)
			)
		);
	}

}

export async function fixSymbols(instance: LocalInstance, subscriptions: Subscription[]) {
	if (instance.current.length === 0) { return; }

	var target = await instance.showQuickPick(instance.current, { placeHolder: "Please select target entry." });
	if (target === undefined) { return; }

	var result = await instance.showInputBox({ value: target, prompt: "Please Fix RegExp. Empty mean is Remove" });

	if (result !== undefined) {
		if (subscriptions.length > instance.cmd_count) {
			subscriptions[subscriptions.length - 1].dispose();
			subscriptions.pop();
		}

		const current = instance.current;
		if (result.length === 0) {
			current.splice(current.indexOf(target), 1);
		} else {
			current[current.indexOf(target)] = result;
		}
		instance.current = current;

		if(current.length > 0){
			subscriptions.push(
				instance.registerDocumentSymbolProvider(
					[{ scheme: 'file' }, { scheme: 'untitled' }], new DynamicSymbolProvider(current)
				)
			);
		}
	}

}

export class SymbolDefine {
	ignore_case: boolean;
	regular_expression: boolean;
	symbol: string;
	constructor(ignore_case?: boolean, regular_expression?: boolean, symbol?: string) {
		this.ignore_case = ignore_case || false;
		this.regular_expression = regular_expression || true;
		this.symbol = symbol || "";
	}
}
export class SymbolSet {
	id: string;
	symbols: SymbolDefine[];
	constructor() {
		this.id = "";
		this.symbols = [];
	}
}

export async function loadSymbolSet(instance: LocalInstance, subscriptions: Subscription[], config?: vscode.WorkspaceConfiguration) {
	if(config === undefined) {return;}
	const symbolset_list = config.get<SymbolSet[]>('definitions');
	if (symbolset_list !== undefined && symbolset_list.length > 0) {
		var target = await instance.showQuickPick(symbolset_list.map(symbolset => symbolset.id), { placeHolder: "Please select RegExp Set." });

		if (target !== undefined && target.length > 0) {
			if (subscriptions.length > instance.cmd_count) {
				subscriptions[subscriptions.length - 1].dispose();
				subscriptions.pop();
			}

			const symbolset = symbolset_list.find(symbolset => symbolset.id === target);
			if (symbolset === undefined) { return; }

			const current = symbolset.symbols.map(symbolDef => symbolDef.symbol);
			instance.current = current;

			subscriptions.push(
				instance.registerDocumentSymbolProvider(
					[{ scheme: 'file' }, { scheme: 'untitled' }], new DynamicSymbolProvider(current)
				)
			);

		}
	}
}

export async function saveSymbolSet(instance: LocalInstance, subscriptions: Subscription[], config?: vscode.WorkspaceConfiguration) {
	if(config === undefined) {return;}
	if (instance.current.length === 0) { return; }

	var result = await instance.showInputBox({ placeHolder: "Please enter representation name for RegExp Set." });
	if (result === undefined || result.length === 0) { return; }

	const symbolset_list = config.get<SymbolSet[]>('definitions');
	if (symbolset_list !== undefined) {
		let symbolset = symbolset_list.find(set=>set.id === result);
		if(symbolset !== undefined){
			//update curren entry
			symbolset.id = result;
			symbolset.symbols = instance.current.map(current => new SymbolDefine(false, true, current));
		}else{
			symbolset = new SymbolSet;
			symbolset.id = result;
			symbolset.symbols = instance.current.map(current => new SymbolDefine(false, true, current));
			symbolset_list.push(symbolset);
		}
		config.update("definitions", symbolset_list, vscode.ConfigurationTarget.Global);
	}

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	class MyButton implements vscode.QuickInputButton {
		constructor(public iconPath: { light: vscode.Uri; dark: vscode.Uri; }, public tooltip: string) { }
	}

	let regexpButton = new MyButton({
			dark: vscode.Uri.file(context.asAbsolutePath('resources/dark/regex.svg')),
			light: vscode.Uri.file(context.asAbsolutePath('resources/light/regex.svg')),
		}, 'Create Resource Group');

	let caseButton = new MyButton({
		dark: vscode.Uri.file(context.asAbsolutePath('resources/dark/case-sensitive.svg')),
		light: vscode.Uri.file(context.asAbsolutePath('resources/light/case-sensitive.svg')),
	}, 'Create Resource Group');

	var instance : LocalInstance = {
		cmd_count : 0,
		current   : [],
		showInputBox : vscode.window.showInputBox,
		showQuickPick : vscode.window.showQuickPick,
		registerDocumentSymbolProvider : vscode.languages.registerDocumentSymbolProvider,
		buttons : [caseButton,regexpButton],
	};

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "dynamical-symbols-debug" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('extension.dynamical-symbols.new', () => {
		// The code you place here will be executed every time your command is executed
		showSymbolDefBox(instance);
//		defineSymbols(instance, context.subscriptions);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.dynamical-symbols.add', () => {
		// The code you place here will be executed every time your command is executed
		addSymbols(instance, context.subscriptions);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.dynamical-symbols.fix', () => {
		// The code you place here will be executed every time your command is executed
		fixSymbols(instance, context.subscriptions);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.dynamical-symbols.load', () => {
		// The code you place here will be executed every time your command is executed
		loadSymbolSet(instance, context.subscriptions, vscode.workspace.getConfiguration('dynamical-symbols'));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.dynamical-symbols.save', () => {
		// The code you place here will be executed every time your command is executed
		saveSymbolSet(instance, context.subscriptions, vscode.workspace.getConfiguration('dynamical-symbols'));
	}));

	instance.cmd_count = context.subscriptions.length;
}

// this method is called when your extension is deactivated
export function deactivate() { }
