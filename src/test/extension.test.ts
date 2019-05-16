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

// Helper Structures
enum ProviderState {
    empty,
    alive,
    new
}

type TestInput = {
    inputBox? : string;
    quickPick? : string;
    symbols? : string[];
    providerState? : ProviderState;
    config? : myExtension.SymbolSet[];
};

type TestOutput = {
    symbols? : string[];
    providerState? : ProviderState;
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

// Helper Class
class TestConfiguation implements vscode.WorkspaceConfiguration{
    symbolSets?: myExtension.SymbolSet[];

    constructor(symbolSets? : myExtension.SymbolSet[]){
        this.symbolSets = symbolSets;
    }

    get<T>(section: string, defaultValue?: T){
        if(section === "definitions"){return this.symbolSets;}
        return defaultValue;
    }

    has(section: string){
        if(section === "definitions"){return true;}
        return false;
    }

    inspect<T>(section: string){
        return undefined;
    }

    async update(section: string, value: any, configurationTarget?: vscode.ConfigurationTarget | boolean){
        if(section === "definitions"){this.symbolSets = value as myExtension.SymbolSet[];}
    }
}

// Helper functions
async function testSymbolOperation(input:TestInput[],output:TestOutput[],func:(instance: myExtension.LocalInstance, subscriptions: myExtension.Subscription[], config?: vscode.WorkspaceConfiguration)=>Promise<void>)
{
    const count = 3;
    const test_count = input.length;

    if(input.length !== output.length) {assert(1,"Need same entry count both input and output."); return;}

    var subscriptions : myExtension.Subscription[];
    var instance: myExtension.LocalInstance;
    var config : TestConfiguation;
    while(input.length>0){
        instance = {
            cmd_count : count,
            current   : input[0].symbols === undefined ? [] : input[0].symbols,
            showInputBox : (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken)=> {
                return new Promise<string|undefined>(resolve => {
                    resolve(input[0].inputBox);
                });
            },
            showQuickPick : (items: string[] | Thenable<string[]>, options?: vscode.QuickPickOptions, token?: vscode.CancellationToken) =>{
                return new Promise<string|undefined>(resolve => {
                    resolve(input[0].quickPick);
                });
            },
            registerDocumentSymbolProvider : (selector: vscode.DocumentSelector, provider: vscode.DocumentSymbolProvider, metaData?: vscode.DocumentSymbolProviderMetadata) => {
                const dynProvider = provider as DynamicSymbolProvider;
                assert.deepEqual(dynProvider.symbolStrList,output[0].symbols,"test count:" + String(test_count-input.length));
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

        config = new TestConfiguation(input[0].config);

        await func(instance,subscriptions,config);
        
        assert.deepEqual(instance.current,output[0].symbols,"test count:" + String(test_count-input.length));
        if(output[0].providerState !== undefined){
            if(output[0].providerState === ProviderState.new){
                //new case
                assert.equal(subscriptions.length,count+1,"test count:" + String(test_count-input.length));
                for(let i=0; i<subscriptions.length-1; i++){
                    assert.equal(subscriptions[i].label, "dummy","test count:" + String(test_count-input.length));
                }
                assert.equal(subscriptions[subscriptions.length-1].label, undefined,"test count:" + String(test_count-input.length));
            }
            else if(output[0].providerState === ProviderState.alive){
                //alive case
                assert.equal(subscriptions.length,count+1,"test count:" + String(test_count-input.length));
                for(let i=0; i<subscriptions.length-1; i++){
                    assert.equal(subscriptions[i].label, "dummy","test count:" + String(test_count-input.length));
                }
                assert.equal(subscriptions[subscriptions.length-1].label, "provider","test count:" + String(test_count-input.length));
            }
            else{
                //empty case
                assert.equal(subscriptions.length,count,"test count:" + String(test_count-input.length));
                for(let i=0; i<subscriptions.length; i++){
                    assert.equal(subscriptions[i].label, "dummy","test count:" + String(test_count-input.length));
                }
            }
        }

        if(output[0].config !== undefined){
            assert.deepEqual(config.symbolSets,output[0].config);
        }
        
        input.shift();
        output.shift();
    }
}


// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", function () {

    // Defines a Mocha unit test
    test("testNew", async function() {
        let input : TestInput[] = [];
        let output : TestOutput[] = [];

        //0:add new entry from empty
        input.push({    providerState:ProviderState.empty,
                        inputBox:"test"});
        output.push({   providerState:ProviderState.new,
                        symbols:["test"]});
                      
        //1:add new null from empty
        input.push({    providerState:ProviderState.empty,
                        inputBox:""});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});
        
         //2:cancel add new from empty
        input.push({    providerState:ProviderState.empty,
                        inputBox:undefined});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});

        //3:add new entry from alive
        input.push({    providerState:ProviderState.alive,
                        inputBox:"test",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.new,
                        symbols:["test"]});
          
        //4:add new null from alive
        input.push({    providerState:ProviderState.alive,
                        inputBox:"",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});

        //5:cancel add new from alive
        input.push({    providerState:ProviderState.alive,
                        inputBox:undefined,
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        await testSymbolOperation(input,output,myExtension.defineSymbols);
    });

    test("testAdd", async function() {
        let input : TestInput[] = [];
        let output : TestOutput[] = [];

        //0:add new entry from empty
        input.push({    providerState:ProviderState.empty,
                        inputBox:"test"});
        output.push({   providerState:ProviderState.new,
                        symbols:["test"]});
                      
        //1:add new null from empty
        input.push({    providerState:ProviderState.empty,
                        inputBox:""});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});
        
         //2:cancel add new from empty
        input.push({    providerState:ProviderState.empty,
                        inputBox:undefined});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});

        //3:add new entry from alive
        input.push({    providerState:ProviderState.alive,
                        inputBox:"test",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.new,
                        symbols:["dummy1","dummy2","test"]});
          
        //4:add new null from alive
        input.push({    providerState:ProviderState.alive,
                        inputBox:"",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        //5:cancel add new from alive
        input.push({    providerState:ProviderState.alive,
                        inputBox:undefined,
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        await testSymbolOperation(input,output,myExtension.addSymbols);
    });

    test("testFix", async function() {
        let input : TestInput[] = [];
        let output : TestOutput[] = [];

        //0:fix new entry from empty (not work fix)
        input.push({    providerState:ProviderState.empty,
                        quickPick:"test",
                        inputBox:"test"});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});
                      
        //1:fix new null from empty  (not work fix)
        input.push({    providerState:ProviderState.empty,
                        quickPick:"test",
                        inputBox:""});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});
        
         //2:cancel fix new from empty  (not work fix)
        input.push({    providerState:ProviderState.empty,
                        quickPick:"test",
                        inputBox:undefined});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});

        //3:fix 2nd entry from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy2",
                        inputBox:"test",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.new,
                        symbols:["dummy1","test"]});
          
        //4:fix 2nd entry null from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy2",
                        inputBox:"",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.new,
                        symbols:["dummy1"]});

        //5:cancel fix 2nd entry from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy2",
                        inputBox:undefined,
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        //6:fix 1st entry from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy1",
                        inputBox:"test",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.new,
                        symbols:["test","dummy2"]});
          
        //7:fix 1st entry null from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy1",
                        inputBox:"",
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.new,
                        symbols:["dummy2"]});

        //8:cancel fix 1st entry from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy1",
                        inputBox:undefined,
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        //9:fix last entry null from alive. it works "remove".
        input.push({    providerState:ProviderState.alive,
                        quickPick:"dummy1",
                        inputBox:"",
                        symbols:["dummy1"]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[]});

        //8:no choice entry by null from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:"",
                        inputBox:undefined,
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        //8:no choice entry by esc from alive
        input.push({    providerState:ProviderState.alive,
                        quickPick:undefined,
                        inputBox:undefined,
                        symbols:["dummy1","dummy2"]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummy1","dummy2"]});

        await testSymbolOperation(input,output,myExtension.fixSymbols);
    });

    //caused by editing gaurd.
    let entry1 : myExtension.SymbolSet = {
        id : "test1",
        symbols : [
            {ignore_case:false, regular_expression:true, symbol: "test1_regex1"},
            {ignore_case:false, regular_expression:true, symbol: "test1_regex2"},
            {ignore_case:false, regular_expression:true, symbol: "test1_regex3"},
        ]
    };

    let entry2 : myExtension.SymbolSet = {
        id : "test2",
        symbols : [
            {ignore_case:false, regular_expression:true, symbol: "test2_regex1"},
            {ignore_case:false, regular_expression:true, symbol: "test2_regex2"},
            {ignore_case:false, regular_expression:true, symbol: "test2_regex3"},
        ]
    };

    let entry3 : myExtension.SymbolSet = {
        id : "test3",
        symbols : [
            {ignore_case:false, regular_expression:true, symbol: "test3_regex1"},
            {ignore_case:false, regular_expression:true, symbol: "test3_regex2"},
            {ignore_case:false, regular_expression:true, symbol: "test3_regex3"},
        ]
    };

    test("testLoad", async function() {
        let input : TestInput[] = [];
        let output : TestOutput[] = [];


        //0:load any entry but it is nothing with empty provider.
        input.push({    providerState:ProviderState.empty,
                        quickPick:"test",
                        symbols:[],
                        config:[]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[],
                        config:[]});
                      
        //1:load cancel by null with empty provider.
        input.push({    providerState:ProviderState.empty,
                        quickPick:"",
                        symbols:[],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[],
                        config:[entry1,entry2,entry3]});
        
         //2:load cancel by ESC with empty provider.
        input.push({    providerState:ProviderState.empty,
                        quickPick:undefined,
                        symbols:[],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[],
                        config:[entry1,entry2,entry3]});

        //3:load 2nd entry with empty provider.
        input.push({    providerState:ProviderState.empty,
                        quickPick:"test2",
                        symbols:[],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.new,
                        symbols:["test2_regex1","test2_regex2","test2_regex3"],
                        config:[entry1,entry2,entry3]});

        //4:load any entry but it is nothing with provider alive.
        input.push({    providerState:ProviderState.alive,
                        quickPick:"test",
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[]});
                      
        //5:load cancel by null with provider alive.
        input.push({    providerState:ProviderState.alive,
                        quickPick:"",
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[entry1,entry2,entry3]});
        
        //6:load cancel by ESC with provider alive.
        input.push({    providerState:ProviderState.alive,
                        quickPick:undefined,
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[entry1,entry2,entry3]});

        //7:load 2nd entry with provider alive.
        input.push({    providerState:ProviderState.alive,
                        quickPick:"test2",
                        symbols:["dummyReg1","dummyReg2","dummyReg3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.new,
                        symbols:["test2_regex1","test2_regex2","test2_regex3"],
                        config:[entry1,entry2,entry3]});

        await testSymbolOperation(input,output,myExtension.loadSymbolSet);
    });

    test("testSave", async function() {
        let replace : myExtension.SymbolDefine[] = [
            {ignore_case:false, regular_expression:true, symbol: "replace1"},
            {ignore_case:false, regular_expression:true, symbol: "replace2"},
            {ignore_case:false, regular_expression:true, symbol: "replace3"}
        ];

        let input : TestInput[] = [];
        let output : TestOutput[] = [];


        //0:Save any entry but it is nothing with empty config.
        input.push({    providerState:ProviderState.empty,
                        inputBox:"test",
                        symbols:[],
                        config:[]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[],
                        config:[]});
                      
        //1:Save cancel by null with  with empty config.
        input.push({    providerState:ProviderState.alive,
                        inputBox:"",
                        symbols:["replace1","replace2","replace3"],
                        config:[]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[]});
        
         //2:Save cancel by ESC with  with empty config.
        input.push({    providerState:ProviderState.alive,
                        inputBox:undefined,
                        symbols:["replace1","replace2","replace3"],
                        config:[]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[]});

        //3:Save entry with empty config.
        input.push({    providerState:ProviderState.alive,
                        inputBox:"replace",
                        symbols:["replace1","replace2","replace3"],
                        config:[]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[{id:"replace",symbols:replace}]});

        //4:Save any entry but it is nothing with config alive.
        input.push({    providerState:ProviderState.empty,
                        inputBox:"test",
                        symbols:[],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.empty,
                        symbols:[],
                        config:[entry1,entry2,entry3]});
                      
        //5:Save cancel by null with  with config alive.
        input.push({    providerState:ProviderState.alive,
                        inputBox:"",
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3]});
        
        //6:Save cancel by ESC with  with config alive.
        input.push({    providerState:ProviderState.alive,
                        inputBox:undefined,
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3]});

        //7:Save entry with config alive.
        input.push({    providerState:ProviderState.alive,
                        inputBox:"replace",
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3,{id:"replace",symbols:replace}]});

        //7:Save entry to 2nd entry of config thats works replace with config alive.
        input.push({    providerState:ProviderState.alive,
                        inputBox:"test2",
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,entry2,entry3]});
        output.push({   providerState:ProviderState.alive,
                        symbols:["replace1","replace2","replace3"],
                        config:[entry1,{id:"test2",symbols:replace},entry3]});

        await testSymbolOperation(input,output,myExtension.saveSymbolSet);
    });
});