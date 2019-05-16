import * as vscode from 'vscode';

export class DynamicSymbolProvider implements vscode.DocumentSymbolProvider {

    symbolStrList: string[];

    constructor(symbolStr: string[]) {
        this.symbolStrList = symbolStr;
    }

    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken): vscode.SymbolInformation[] {

        const result: vscode.SymbolInformation[] = [];
        const symbolRegexps: RegExp[] = this.symbolStrList.map(str => new RegExp(str));

        let prevline : number = 0;
        let prevReg  : string[] = [];
        let curReg   : string[] = [];

        for (let line = 0; line < document.lineCount; line++) {
            const { text } = document.lineAt(line);
            curReg = [];
            symbolRegexps.forEach(regexp => {
                let reg = regexp.exec(text);
                if(reg !== null){
                    curReg.push(reg[0]);
                }
            });
            if (curReg.length > 0) {
                if(prevReg.length > 0){
                    const prevTextLine = document.lineAt(line-1);
                    prevReg.forEach(prev=>{
                        result.push(
                            new vscode.SymbolInformation(
                                prev,
                                vscode.SymbolKind.String,
                                prev,
                                new vscode.Location(document.uri, new vscode.Range(new vscode.Position(prevline, 0), new vscode.Position(line-1, prevTextLine.text.length)))
                        ));});
                    
                }
                prevline = line;
                prevReg  = curReg;
            }
        }

        if(prevReg.length > 0){
            const prevTextLine = document.lineAt(document.lineCount-1);
            result.push(
                new vscode.SymbolInformation(
                    prevReg[0],
                    vscode.SymbolKind.String,
                    prevReg[0],
                    new vscode.Location(document.uri, new vscode.Range(new vscode.Position(prevline, 0), new vscode.Position(document.lineCount-1, prevTextLine.text.length)))
                ));
        }

        return result;
    }
}