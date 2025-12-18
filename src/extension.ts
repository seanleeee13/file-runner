import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

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
            } else {
                vscode.window.showErrorMessage("Not an available file.");
                return;
            }
            if ((ext === ".cpp" || ext === ".c") && fs.existsSync(runCmd)) {
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
                terminal = vscode.window.createTerminal("File Runner", "cmd");
            }
            terminal.show();
            if (ext === ".cpp" || ext === ".c") {
                terminal.sendText(`${compileCmd} && "${runCmd}"`);
            } else if (ext === ".exe" || ext === ".bat" || ext === ".js" || ext === ".rb") {
                terminal.sendText(`${runCmd}`);
            } else if (ext === ".ts") {
                terminal.sendText(`${compileCmd} && ${runCmd}`)
            }
        }
    );
    context.subscriptions.push(runCommand);
	context.subscriptions.push(vscode.commands.registerCommand('file-runner.runFile-icon', () => {
        vscode.commands.executeCommand('file-runner.runFile');
    }));
}
