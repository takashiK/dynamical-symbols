// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DynamicSymbolProvider } from './dynamicSymbolProvider';

class LocalStorage{
	cmd_count : number;
	current   : string[];
	constructor(){
		this.cmd_count = 0;
		this.current   = [];
	}
}

export async function defineSymbols(storage: LocalStorage, context: vscode.ExtensionContext)
{
	var result = await vscode.window.showInputBox();

	if(result !== undefined){
		if(context.subscriptions.length > storage.cmd_count){
			context.subscriptions[context.subscriptions.length-1].dispose();
			context.subscriptions.pop();
		}

		if(result.length !== 0){
			const current  = [result];
			storage.current = current;

			context.subscriptions.push(
				vscode.languages.registerDocumentSymbolProvider(
					[{scheme: 'file'},{scheme: 'untitled'}], new DynamicSymbolProvider(current)
				)
			);
		}
	}

}

export async function addSymbols(storage: LocalStorage, context: vscode.ExtensionContext)
{
	var result = await vscode.window.showInputBox();

	if(result !== undefined){
		if(context.subscriptions.length > storage.cmd_count){
			context.subscriptions[context.subscriptions.length-1].dispose();
			context.subscriptions.pop();
		}

		if(result.length !== 0){
			const current  = storage.current;
			current.push(result);
			storage.current = current;

			context.subscriptions.push(
				vscode.languages.registerDocumentSymbolProvider(
					[{scheme: 'file'},{scheme: 'untitled'}], new DynamicSymbolProvider(current)
				)
			);
		}
	}

}

export async function fixSymbols(storage: LocalStorage, context: vscode.ExtensionContext)
{ 
	if(storage.current.length === 0){return;}

	var target = await vscode.window.showQuickPick(storage.current);
	if(target === undefined){return;}

	var result = await vscode.window.showInputBox({value: target});

	if(result !== undefined){
		if(context.subscriptions.length > storage.cmd_count){
			context.subscriptions[context.subscriptions.length-1].dispose();
			context.subscriptions.pop();
		}

		if(result.length !== 0){
			const current  = storage.current;
			current[current.indexOf(target)] = result;

			context.subscriptions.push(
				vscode.languages.registerDocumentSymbolProvider(
					[{scheme: 'file'},{scheme: 'untitled'}], new DynamicSymbolProvider(current)
				)
			);
		}
	}

}

class SymbolDefine{
	ignore_case : boolean;
	regular_expression : boolean;
	symbol : string;
	constructor(ignore_case?:boolean, regular_expression?:boolean,symbol?:string){
		this.ignore_case = ignore_case || false;
		this.regular_expression = regular_expression || true;
		this.symbol = symbol || "";
	}
}
class SymbolSet{
	id : string;
	symbols : SymbolDefine[];
	constructor(){
		this.id = "";
		this.symbols = [];
	}
}

export async function loadSymbolSet(storage: LocalStorage, context: vscode.ExtensionContext)
{
	const configs = vscode.workspace.getConfiguration('dynamical-symbols').get<SymbolSet[]>('definitions');
	if(configs !== undefined && configs.length > 0){
		var target = await vscode.window.showQuickPick(configs.map(config=>config.id));

		if(target !== undefined){
			if(context.subscriptions.length > storage.cmd_count){
				context.subscriptions[context.subscriptions.length-1].dispose();
				context.subscriptions.pop();
			}

			const config = configs.find(config=>config.id === target);
			if(config === undefined) { return; }

			const current = config.symbols.map(symbolDef=> symbolDef.symbol);
			storage.current = current;

			context.subscriptions.push(
				vscode.languages.registerDocumentSymbolProvider(
					[{scheme: 'file'},{scheme: 'untitled'}], new DynamicSymbolProvider(current)
				)
			);
	
		}
	}
}

export async function saveSymbolSet(storage: LocalStorage, context: vscode.ExtensionContext)
{
	if(storage.current.length === 0) {return;}

	var result = await vscode.window.showInputBox();
	if(result === undefined) {return;}

	const configs = vscode.workspace.getConfiguration('dynamical-symbols').get<SymbolSet[]>('definitions');
	if(configs !== undefined){
		let config = new SymbolSet;
		config.id = result;
		config.symbols = storage.current.map(current => new SymbolDefine(false,true,current));
		configs.push(config);
		vscode.workspace.getConfiguration('dynamical-symbols').update("definitions",configs,vscode.ConfigurationTarget.Global);
	}
	
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	var storage = new LocalStorage;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
		console.log('Congratulations, your extension "dynamical-symbols" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push( vscode.commands.registerCommand('extension.dynamical-symbols.new', () => {
		// The code you place here will be executed every time your command is executed
		defineSymbols(storage,context);
	}));

	context.subscriptions.push( vscode.commands.registerCommand('extension.dynamical-symbols.add', () => {
		// The code you place here will be executed every time your command is executed
		addSymbols(storage,context);
	}));

	context.subscriptions.push( vscode.commands.registerCommand('extension.dynamical-symbols.fix', () => {
		// The code you place here will be executed every time your command is executed
		fixSymbols(storage,context);
	}));

	context.subscriptions.push( vscode.commands.registerCommand('extension.dynamical-symbols.load', () => {
		// The code you place here will be executed every time your command is executed
		loadSymbolSet(storage,context);
	}));

	context.subscriptions.push( vscode.commands.registerCommand('extension.dynamical-symbols.save', () => {
		// The code you place here will be executed every time your command is executed
		saveSymbolSet(storage,context);
	}));

	storage.cmd_count = context.subscriptions.length;
}

// this method is called when your extension is deactivated
export function deactivate() {}
