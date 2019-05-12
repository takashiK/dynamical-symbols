//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

import * as vscode from 'vscode';
import * as myExtension from '../extension';
import { DynamicSymbolProvider } from '../dynamicSymbolProvider';
import { promises } from 'fs';

// Helper Structures
enum ProviderState {
    empty,
    alive
}

enum ProviderAction{
    add,
    remove
}

type TestInput = {
    inputBox? : string;
    quickPick? : string;
    symbols? : string[];
    subscription? : number;
    providerState? : ProviderState;
    config? : myExtension.SymbolSet[];
};

type TestOutput = {
    symbols? : string[];
    providerActions? : ProviderAction[];
    config? : myExtension.SymbolSet[];
};

class DummyDisposable{
    label : string;
    constructor ( label: string ){
        this.label = label;
    }
    dispose(){
        //nothing to do.
    }
}

// Helper functions
async function testSymbolOperation(input:TestInput[],output:TestOutput[],func:(instance: myExtension.LocalInstance, subscriptions: myExtension.Subscription[])=>Promise<void>)
{
    const count = 3;

    if(input.length !== output.length) {assert(1,"Need same entry count both input and output."); return;}

    var subscriptions : myExtension.Subscription[];
    var instance: myExtension.LocalInstance;
    while(input.length>0){
        instance = {
            cmd_count : count,
            current   : input[0].symbols === undefined ? [] : input[0].symbols,
            showInputBox : (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken)=> {
                return new Promise(resolve => {
                    return input[0].inputBox;
                });
            },
            showQuickPick : (items: string[] | Thenable<string[]>, options?: vscode.QuickPickOptions, token?: vscode.CancellationToken) =>{
                return new Promise(resolve => {
                    return input[0].quickPick;
                });
            },
            registerDocumentSymbolProvider : (selector: vscode.DocumentSelector, provider: vscode.DocumentSymbolProvider, metaData?: vscode.DocumentSymbolProviderMetadata) => {
                const dynProvider = provider as DynamicSymbolProvider;
                assert.deepEqual(dynProvider.symbolStrList,output[0].symbols);
                return new vscode.Disposable(()=>{});
            }
            
        };

        subscriptions = [];
        for(let c=0; c<count; c++){
            subscriptions.push(new DummyDisposable("dummy"));
        }
        if(input[0].providerState !== undefined && input[0].providerState === ProviderState.alive){
            subscriptions.push(new DummyDisposable("provider"));
        }

        await func(instance,subscriptions);
        

        
        input.pop();
        output.pop();
    }
}

function testSymbolSetConfig(input:TestInput,output:TestOutput,func:(instance: myExtension.LocalInstance, context: vscode.ExtensionContext, config: vscode.WorkspaceConfiguration)=>Promise<void>)
{

}

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", function () {

    // Defines a Mocha unit test
    test("Something 1", function() {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });
});