import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { fileURLToPath } from "url";

function updateCargoContext() {
    const folders = vscode.workspace.workspaceFolders;
    let hasCargo = false;
    if (folders) {
        for (const folder of folders) {
            const cargoPath = path.join(folder.uri.fsPath, 'Cargo.toml');
            if (fs.existsSync(cargoPath)) {
                hasCargo = true;
                break;
            }
        }
    }
    vscode.commands.executeCommand('setContext', 'hasCargoToml', hasCargo);
}

export function activate(context: vscode.ExtensionContext) {
    const runCommand = vscode.commands.registerCommand(
        "file-runner.runFile",
        () => {
            const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
            let fileUri;
            if (
                tabInput instanceof vscode.TabInputText ||
                tabInput instanceof vscode.TabInputCustom
            ) {
                fileUri = tabInput.uri;
            }
            if (!fileUri || fileUri.scheme !== 'file') {
                vscode.window.showErrorMessage('Selected file is an invalid local file.');
                return;
            }
            const filePath = fileURLToPath(fileUri.toString())
            const ext = path.extname(filePath).toLowerCase();
            const base = filePath.replace(ext, "");
            let compileCmd = "";
            let runCmd = "";
            if (ext === ".cpp" || ext === ".c" || ext === ".ts" || ext == ".rs") {
                const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "vscode-cpp-" + 
Math.random().toString(36).substring(2, 7))
                );
            } // 여기부터
            if (ext === ".cpp") {
                runCmd = base + ".exe";
                compileCmd = `g++ "${filePath}" -o "${runCmd}"`;
            } else if (ext === ".c") {
                runCmd = base + ".exe";
                compileCmd = `gcc "${filePath}" -o "${runCmd}"`;
            } else if (ext === ".exe") {
                runCmd = filePath;
            } else if (ext === ".bat") {
                runCmd = filePath;
            } else if (ext === ".js") {
                runCmd = `node "${filePath}"`;
            } else if (ext === ".ts") {
                runCmd = `node "${base}.js"`;
                compileCmd = `tsc "${filePath}"`
            } else if (ext === ".rb") {
                runCmd = `ruby "${filePath}"`
            } else if (ext === ".rs") {
                runCmd = base + ".exe";
                compileCmd = `rustc "${base}.rs" -o "${base}"`
            } else {
                vscode.window.showErrorMessage("Not an available file.");
                return;
            }
            if ((ext === ".cpp" || ext === ".c" || ext === ".rs") && fs.existsSync(runCmd)) {
                try {
                    fs.unlinkSync(runCmd);
                } catch {
                    vscode.window.showErrorMessage("Failed to delete existing exe file.");
                    return;
                }
            }
            if ((ext === ".ts") && fs.existsSync(base + ".js")) {
                try {
                    fs.unlinkSync(base + ".js");
                } catch {
                    vscode.window.showErrorMessage("Failed to delete existing js file.");
                    return;
                }
            }
            let terminal = vscode.window.terminals.find(
                (t) => t.name === "File Runner"
            );
            if (!terminal) {
                terminal = vscode.window.createTerminal("File Runner", "cmd /k");
            }
            terminal.show();
            if (ext === ".cpp" || ext === ".c" || ext === ".rs") {
                terminal.sendText(`${compileCmd} && "${runCmd}"`);
            } else if (ext === ".exe" || ext === ".bat" || ext === ".js" || ext === ".rb") {
                terminal.sendText(`${runCmd}`);
            } else if (ext === ".ts") {
                terminal.sendText(`${compileCmd} && ${runCmd}`)
            }
        }
    );
    const cargoRunCommand = vscode.commands.registerCommand(
        "file-runner.runRustFileCargo",
        () => {
            const tabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
            let fileUri;
            if (
                tabInput instanceof vscode.TabInputText ||
                tabInput instanceof vscode.TabInputCustom
            ) {
                fileUri = tabInput.uri;
            }
            if (!fileUri || fileUri.scheme !== 'file') {
                vscode.window.showErrorMessage('Selected file is an invalid local file.');
                return;
            }
            const filePath = fileURLToPath(fileUri.toString())
            const ext = path.extname(filePath).toLowerCase();
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage("No open folder.");
                return;
            }
            const rootPath = workspaceFolders[0].uri.fsPath;
            const cargoTomlPath = path.join(rootPath, 'Cargo.toml');
            const isCargoProject = fs.existsSync(cargoTomlPath);
            const relativePath = path.relative(rootPath, filePath);
            const isInSrc = relativePath.startsWith('src');
            const isInBin = relativePath.startsWith('src' + path.sep + 'bin');
            let runCmd = "";
            if (ext !== ".rs" || !isCargoProject || !isInSrc || (!isInBin && relativePath !== 'src' + path.sep + 'main.rs')) {
                vscode.window.showErrorMessage("Not an available file / folder.");
                return;
            }
            if (isInBin) {
                runCmd = `cargo run --bin ${path.parse(filePath).name}`;
            } else {
                runCmd = "cargo run";
            }
            let terminal = vscode.window.terminals.find(
                (t) => t.name === "File Runner"
            );
            if (!terminal) {
                terminal = vscode.window.createTerminal("File Runner", "cmd /k");
            }
            terminal.show();
            terminal.sendText(runCmd);
        }
    );
    const autoInsert = vscode.workspace.onDidOpenTextDocument(
        async (doc) => {
            await vscode.window.showInformationMessage(doc.languageId + " " + String(doc.version))
            if (path.extname(doc.fileName).toLowerCase() === ".cpp" && doc.version === 1) {
                if (fs.existsSync("defaults/default.cpp")) {
                    fs.readFile("defaults/default.cpp", "utf-8", async (err, data) => {
                        if (err) {
                            vscode.window.showErrorMessage("An error occured");
                            return;
                        }
                        fs.writeFile(doc.fileName, data, (err) => {
                            if (err) {
                                vscode.window.showErrorMessage("An error occured");
                                return;
                            }
                        });
                    })
                } else {
                    console.log("ok");
                    const cppDefault = `#include <bits/stdc++.h>

using namespace std;
int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cout.tie(nullptr);
    $0
}`;
                    fs.writeFile(doc.fileName, cppDefault, (err) => {
                        if (err) {
                            vscode.window.showErrorMessage("An error occured");
                            return;
                        }
                    });
                }
            }
        }
    );
    updateCargoContext();
    vscode.workspace.onDidChangeWorkspaceFolders(updateCargoContext);
    context.subscriptions.push(runCommand);
	context.subscriptions.push(vscode.commands.registerCommand('file-runner.runFile-icon', () => {
        vscode.commands.executeCommand('file-runner.runFile');
    }));
    context.subscriptions.push(cargoRunCommand);
	context.subscriptions.push(vscode.commands.registerCommand('file-runner.runRustFileCargo-icon', () => {
        vscode.commands.executeCommand('file-runner.runRustFileCargo');
    }));
    context.subscriptions.push(autoInsert);
}
